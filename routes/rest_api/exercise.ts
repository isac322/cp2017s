import {Request, Response} from "express";
import * as crypto from "crypto";
import * as fs from "fs";
import * as fs_ext from "fs-extra";
import * as iconv from "iconv-lite";
import {createConnection, IConnection, IError} from "mysql";
import * as path from "path";
import {
	docker,
	exerciseSetPath,
	logger,
	submittedExerciseOriginalPath,
	submittedExercisePath,
	tempPath
} from "../../app";
import * as util from "util";
import * as async from "async";

const charsetDetector = require('detect-character-encoding');

const dbConfig = JSON.parse(fs.readFileSync('config/database.json', 'utf-8'));
const dbClient: IConnection = createConnection({
	host: dbConfig.host,
	user: dbConfig.user,
	password: dbConfig.password,
	database: dbConfig.database
});

const enum Result {correct, incorrect, compileError, timeout, runtimeError, scriptError}


/**
 * Run and return result uploaded exercise
 *
 * @method uploadExercise
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export function uploadExercise(req: Request, res: Response) {
	if (!req.session.signIn) return res.sendStatus(401);

	const hash = crypto.createHash('sha512');
	const file = (<any>req).files.attachment;
	const attachId = req.params.attachId;
	const studentId = req.session.studentId;

	const encodingInfo: { encoding: string, confidence: number } = charsetDetector(file.data);
	logger.debug(util.inspect(encodingInfo, {showHidden: false, depth: 1}));


	let hashedOriginal: string | null = crypto.createHash('sha512').update(file.data).digest('hex');


	let fileContent: string;
	if (encodingInfo.encoding == 'UTF-8') {
		fileContent = iconv.decode(file.data, encodingInfo.encoding);
	}
	else {
		fileContent = iconv.decode(file.data, 'EUC-KR');
	}

	const hashedName = hash.update(fileContent).digest('hex');


	if (hashedName == hashedOriginal) {
		hashedOriginal = null;
	}
	else {
		// backup original file
		fs.writeFile(path.join(submittedExerciseOriginalPath, hashedOriginal), file.data, {mode: 0o600},
			(err: NodeJS.ErrnoException) => {
				if (err) {
					logger.error('[rest_api::uploadExercise::writeOriginalFile] : ');
					logger.error(util.inspect(err, {showHidden: false}));
				}
			});
	}


	fs.writeFile(path.join(submittedExercisePath, hashedName), fileContent, {mode: 0o600}, (err: NodeJS.ErrnoException) => {
		if (err) {
			logger.error('[rest_api::uploadExercise::writeFile] : ');
			logger.error(util.inspect(err, {showHidden: false}));
		}
	});


	// get information of this exercise by given id (attachId)
	dbClient.query(
		'SELECT name, extension, test_set_size, input_through_arg FROM exercise_config WHERE id = ?;', attachId,
		(err: IError, searchResult) => {
			if (err) {
				logger.error('[rest_api::uploadExercise::select] : ');
				logger.error(util.inspect(err, {showHidden: false}));
				res.sendStatus(500);
				return;
			}


			// a temporarily created shared path that contains source code to judge
			const sourcePath = fs.mkdtempSync(path.join(tempPath, studentId + '_'));
			// a temporarily created shared path that will contain output
			const outputPath = fs.mkdtempSync(path.join(tempPath, studentId + '_'));


			// write config file of this judge to shared folder
			fs.writeFile(
				path.join(sourcePath, 'config.json'),
				JSON.stringify({
					sourceName: searchResult[0].name,
					extension: searchResult[0].extension,
					testSetSize: searchResult[0].test_set_size,
					inputThroughArg: searchResult[0].input_through_arg
				}),
				{mode: 0o400}
			);

			// copy given source code to shared folder
			fs.writeFileSync(path.join(sourcePath, searchResult[0].name), fileContent, {mode: 0o600});


			dbClient.query(
				'INSERT INTO exercise_log (student_id, attachment_id, email, file_name, original_file) VALUE (?, ?, ?, ?, ?);',
				[studentId, attachId, req.session.email, hashedName, hashedOriginal],
				(err: IError, insertResult) => {
					if (err) {
						logger.error('[rest_api::uploadExercise::insert] : ');
						logger.error(util.inspect(err, {showHidden: false}));
						res.sendStatus(500);
						return;
					}

					logger.debug('[uploadExercise:insert into exercise_log]');
					logger.debug(util.inspect(insertResult, {showHidden: false, depth: 1}));

					runJudging(res, insertResult.insertId, attachId, outputPath, sourcePath);
				}
			);
		}
	);
}


/**
 * Rejudge unresolved exercise
 *
 * @method resolveUnhandled
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export function resolveUnhandled(req: Request, res: Response) {
	if (!req.session.admin) return res.sendStatus(401);

	dbClient.query(
		'SELECT exercise_log.id, exercise_log.attachment_id AS `attachId`, exercise_log.student_id AS `studentId`, file_name AS `fileName` ' +
		'FROM exercise_log ' +
		'    LEFT JOIN exercise_result ON exercise_result.log_id = exercise_log.id ' +
		'WHERE exercise_result.id IS NULL;',
		(err: IError, searchList) => {
			if (err) {
				logger.error('[rest_api::resolveUnhandled::search] : ');
				logger.error(util.inspect(err, {showHidden: false}));
				res.sendStatus(500);
				return;
			}

			for (const log of searchList) {
				// get information of this exercise by given id (attachId)
				dbClient.query(
					'SELECT name, extension, test_set_size, input_through_arg FROM exercise_config WHERE id = ?;', log.attachId,
					(err: IError, exerciseSetting) => {
						if (err) {
							logger.error('[rest_api::resolveUnhandled::select] : ');
							logger.error(util.inspect(err, {showHidden: false, depth: 1}));
							res.sendStatus(500);
							return;
						}


						// a temporarily created shared path that contains source code to judge
						const sourcePath = fs.mkdtempSync(path.join(tempPath, log.studentId + '_'));
						// a temporarily created shared path that will contain output
						const outputPath = fs.mkdtempSync(path.join(tempPath, log.studentId + '_'));


						// write config file of this judge to shared folder
						fs.writeFile(
							path.join(sourcePath, 'config.json'),
							JSON.stringify({
								sourceName: exerciseSetting[0].name,
								extension: exerciseSetting[0].extension,
								testSetSize: exerciseSetting[0].test_set_size,
								inputThroughArg: exerciseSetting[0].input_through_arg
							}),
							{mode: 0o400}
						);

						// copy given source code to shared folder
						fs_ext.copySync(
							path.join(submittedExercisePath, log.fileName),
							path.join(sourcePath, exerciseSetting[0].name));

						runJudging(null, log.id, log.attachId, outputPath, sourcePath);
					});
			}
		});

	return res.sendStatus(200);
}


function runJudging(res: Response | null, logId: number, attachId: number, outputPath: string, sourcePath: string) {
	const inputPath = path.join(exerciseSetPath, attachId.toString(), 'input');
	const answerPath = path.join(exerciseSetPath, attachId.toString(), 'output');

	docker.run(
		'judge_server',
		['bash', './judge.sh'],
		[{
			write: (message: Buffer) => {
				logger.debug('[rest_api::runJudging::docker.stdout]');
				logger.debug(message.toString());
			}
		}, {
			write: (message: Buffer) => {
				logger.error('[rest_api::runJudging::docker.stderr]');
				logger.error(message.toString());
			}
		}],
		{
			Volumes: {
				'/home/tester/source': {},
				'/home/tester/input': {},
				'/home/tester/output': {},
				'/home/tester/answer': {}
			},
			HostConfig: {
				Binds: [
					sourcePath + ':/home/tester/source:ro',
					inputPath + ':/home/tester/input:ro',
					outputPath + ':/home/tester/output:rw',
					answerPath + ':/home/tester/answer:ro'
				]
			},
			Tty: false
		},
		(err: any, data: any, container: any) => {
			if (err) {
				logger.error('[rest_api::runJudging::docker_run] : ');
				logger.error(util.inspect(err, {showHidden: false}));
				if (res) res.sendStatus(500);
				return;
			}

			handleResult(res, logId, answerPath, inputPath, outputPath);

			// remove input temporary folder
			fs_ext.remove(sourcePath, (err: Error) => {
				if (err) {
					logger.error('[rest_api::runJudging::temp_remove] : ');
					logger.error(util.inspect(err, {showHidden: false}));
				}
			});

			container.remove();
		});
}


function handleResult(res: Response | null, logId: number, answerPath: string, inputPath: string, outputPath: string) {
	const resultFile = path.join(outputPath, 'result.json');

	fs.exists(resultFile, (exists: boolean) => {
		// if result.js is exist, it means that this judge was successful or runtime exceptions or timeout occur
		if (exists) {
			fs.readFile(resultFile, 'UTF-8', (err: NodeJS.ErrnoException, data: string) => {
				const result: {
					isMatched: boolean, errorLog?: string, returnCode?: number,
					inputIndex?: number, userOutput?: string
				} = JSON.parse(data);

				// remove output temporary folder
				fs_ext.remove(outputPath, (err: Error) => {
					if (err) {
						logger.error('[rest_api::handleResult::temp_remove] : ');
						logger.error(util.inspect(err, {showHidden: false}));
					}
				});


				// the judge was correct
				if (result.isMatched) {
					if (res) res.sendStatus(200);

					dbClient.query(
						'INSERT INTO exercise_result (log_id, type, runtime_error) VALUE (?, ?, ?);',
						[logId, Result.correct, result.errorLog],
						(err) => {
							if (err) {
								logger.error('[rest_api::handleResult::insert_judge_correct] : ');
								logger.error(util.inspect(err, {showHidden: false}));
							}
						});

					if (result.errorLog) {
						logger.error('[rest_api::handleResult::insert_judge_correct-found_error] ' + logId);
					}
				}

				// or if runtime exceptions or timeout occur
				else if ('returnCode' in result) {
					// timeout
					if (result.returnCode == 124) {
						fs.readFile(path.join(inputPath, result.inputIndex + '.in'), 'UTF-8',
							(err: NodeJS.ErrnoException, data: string) => {
								if (err) {
									logger.error('[rest_api::handleResult::read_file::read_file:timeout] : ');
									logger.error(util.inspect(err, {showHidden: false}));
									if (res) res.sendStatus(500);
									return;
								}

								if (res) res.status(410).json({input: data});
							});

						dbClient.query(
							'INSERT INTO exercise_result (log_id, type, return_code, failed_index) VALUE (?, ?, ?, ?);',
							[logId, Result.timeout, result.returnCode, result.inputIndex],
							(err) => {
								if (err) {
									logger.error('[rest_api::handleResult::insert_judge_timeout] : ');
									logger.error(util.inspect(err, {showHidden: false}));
								}
							});
					}
					// runtime error
					else {
						fs.readFile(path.join(inputPath, result.inputIndex + '.in'), 'UTF-8',
							(err: NodeJS.ErrnoException, data: string) => {
								if (err) {
									logger.error('[rest_api::handleResult::read_file::read_file:runtimeError] : ');
									logger.error(util.inspect(err, {showHidden: false}));
									if (res) res.sendStatus(500);
									return;
								}

								if (res) res.status(412).json({
									input: data,
									errorLog: result.errorLog,
									returnCode: result.returnCode
								});
							});

						dbClient.query(
							'INSERT INTO exercise_result (log_id, type, return_code, runtime_error, failed_index) VALUE (?, ?, ?, ?, ?);',
							[logId, Result.runtimeError, result.returnCode, result.errorLog, result.inputIndex],
							(err) => {
								if (err) {
									logger.error('[rest_api::handleResult::insert_judge_runtime_error] : ');
									logger.error(util.inspect(err, {showHidden: false}));
								}
							});
					}
				}

				// or it was incorrect
				else {
					let tasks = [
						(callback: (err: NodeJS.ErrnoException, data: string) => void) => {
							fs.readFile(path.join(answerPath, result.inputIndex + '.out'), 'UTF-8', callback)
						},
						(callback: (err: NodeJS.ErrnoException, data: string) => void) => {
							fs.readFile(path.join(inputPath, result.inputIndex + '.in'), 'UTF-8', callback)
						}
					];

					async.parallel(tasks, (err: NodeJS.ErrnoException, data: Array<string>) => {
						if (err) {
							logger.error('[rest_api::handleResult::incorrect::read_file] : ');
							logger.error(util.inspect(err, {showHidden: false}));
							if (res) res.sendStatus(500);
							return;
						}

						if (res) res.status(406).json({
							userOutput: result.userOutput,
							answerOutput: data[0],
							input: data[1]
						});
					});

					dbClient.query(
						'INSERT INTO exercise_result (log_id, type, failed_index, user_output, runtime_error) VALUE (?, ?, ?, ?, ?);',
						[logId, Result.incorrect, result.inputIndex, result.userOutput, result.errorLog],
						(err) => {
							if (err) {
								logger.error('[rest_api::handleResult::insert_judge_incorrect] : ');
								logger.error(util.inspect(err, {showHidden: false}));
							}
						});
				}
			});
		}

		// or it can be compile error or run command error or internal server error
		else {
			const errorLogFile = path.join(outputPath, 'error.log');

			fs.exists(errorLogFile, (exists: boolean) => {
				// script error
				if (exists) {
					fs.readFile(errorLogFile, 'UTF-8', (err: NodeJS.ErrnoException, errorStr: string) => {
						if (err) {
							logger.error('[rest_api::handleResult::read_file] : ');
							logger.error(util.inspect(err, {showHidden: false}));
							if (res) res.sendStatus(500);
							return;
						}

						if (res) res.status(417).json({errorMsg: errorStr});


						// remove output temporary folder
						fs_ext.remove(outputPath, (err: Error) => {
							if (err) {
								logger.error('[rest_api::handleResult::remove_file] : ');
								logger.error(util.inspect(err, {showHidden: false}));
							}
						});

						dbClient.query(
							'INSERT INTO exercise_result(log_id, type, script_error) VALUE(?, ?, ?);',
							[logId, Result.scriptError, errorStr],
							(err) => {
								if (err) {
									logger.error('[rest_api::handleResult::insert_script_error] : ');
									logger.error(util.inspect(err, {showHidden: false}));
								}
							});
					});
				}
				else {
					const compileErrorFile = path.join(outputPath, 'compile_error.log');

					fs.exists(compileErrorFile, (exists: boolean) => {
						// compile error
						if (exists) {
							fs.readFile(compileErrorFile, 'UTF-8', (err: NodeJS.ErrnoException, errorStr: string) => {
								if (err) {
									logger.error('[rest_api::handleResult::read_file] : ');
									logger.error(util.inspect(err, {showHidden: false}));
									if (res) res.sendStatus(500);
									return;
								}

								// remove output temporary folder
								fs_ext.remove(outputPath, (err: Error) => {
									if (err) {
										logger.error('[rest_api::handleResult::remove_file] : ');
										logger.error(util.inspect(err, {showHidden: false}));
									}
								});

								if (res) res.status(400).json({errorMsg: errorStr});


								dbClient.query(
									'INSERT INTO exercise_result(log_id, type, compile_error) VALUE(?,?,?);',
									[logId, Result.compileError, errorStr],
									(err) => {
										if (err) {
											logger.error('[rest_api::handleResult::insert_compile_error] : ');
											logger.error(util.inspect(err, {showHidden: false}));
										}
									});
							})
						}

						// something else
						else {
							logger.error('[rest_api::handleResult::something_else]');
							if (res) res.status(500).json({id: logId});
						}
					});
				}
			});
		}
	});
}


/**
 * Send judge result of exercise data to client.
 *
 * @method fetchJudgeResult
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export function fetchJudgeResult(req: Request, res: Response) {
	if (!req.session.signIn) return 401;

	dbClient.query(
		'SELECT student_id, attachment_id, type, compile_error, failed_index, user_output, return_code, runtime_error, script_error ' +
		'FROM exercise_log JOIN exercise_result ON exercise_log.id = exercise_result.log_id ' +
		'WHERE log_id = ?',
		req.params.logId,
		(err: IError, searchResult) => {
			if (err) {
				logger.error('[rest_api::fetchJudgeResult::search] : ');
				logger.error(util.inspect(err, {showHidden: false}));
				res.sendStatus(500);
				return;
			}

			const result: {
				student_id: string, attachment_id: number, type: number, compile_error: string, failed_index: number,
				user_output: string, return_code: number, runtime_error: string, script_error: string
			} = searchResult[0];

			// if non-admin user requested another one's result
			if (!req.session.admin && req.session.studentId != result.student_id) {
				res.sendStatus(401);
				return;
			}

			const testSetPath = path.join(exerciseSetPath, result.attachment_id.toString());

			switch (result.type) {
				case Result.correct:
					res.sendStatus(200);
					break;

				case Result.incorrect:
					let tasks = [
						(callback: (err: NodeJS.ErrnoException, data: string) => void) => {
							fs.readFile(path.join(testSetPath, 'input', result.failed_index + '.in'), 'UTF-8', callback)
						},
						(callback: (err: NodeJS.ErrnoException, data: string) => void) => {
							fs.readFile(path.join(testSetPath, 'output', result.failed_index + '.out'), 'UTF-8', callback)
						}
					];

					async.parallel(tasks, (err: NodeJS.ErrnoException, data: Array<string>) => {
						if (err) {
							logger.error('[rest_api::handleResult::fetchJudgeResult::incorrect::read_file] : ');
							logger.error(util.inspect(err, {showHidden: false}));
							res.sendStatus(500);
							return;
						}

						res.status(406).json({
							userOutput: result.user_output,
							answerOutput: data[1],
							input: data[0]
						});
					});
					break;

				case Result.compileError:
					res.status(400).json({errorMsg: result.compile_error});
					break;

				case Result.timeout:
					fs.readFile(path.join(testSetPath, 'input', result.failed_index + '.in'), 'UTF-8',
						(err: NodeJS.ErrnoException, data: string) => {
							if (err) {
								logger.error('[rest_api::handleResult::fetchJudgeResult::timeout::read_file] : ');
								logger.error(util.inspect(err, {showHidden: false}));
								res.sendStatus(500);
								return;
							}

							res.status(410).json({input: data});
						});
					break;

				case Result.runtimeError:
					fs.readFile(path.join(testSetPath, 'input', result.failed_index + '.in'), 'UTF-8',
						(err: NodeJS.ErrnoException, data: string) => {
							if (err) {
								logger.error('[rest_api::handleResult::fetchJudgeResult::runtimeError::read_file] : ');
								logger.error(util.inspect(err, {showHidden: false}));
								res.sendStatus(500);
								return;
							}

							res.status(412).json({
								input: data,
								errorLog: result.runtime_error,
								returnCode: result.return_code
							});
						});
					break;

				case Result.scriptError:
					res.status(417).json({errorMsg: result.script_error});
					break;
			}
		});
}


/**
 * Send exercise file.
 *
 * @method downloadSubmittedFile
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export function downloadSubmittedExercise(req: Request, res: Response) {
	if (!req.session.signIn) return res.sendStatus(401);

	dbClient.query(
		'SELECT student_id AS `studentId`, file_name AS `fileName`, original_file AS `originalFile`, name ' +
		'FROM exercise_log JOIN exercise_config ON exercise_log.attachment_id = exercise_config.id ' +
		'WHERE exercise_log.id = ?',
		req.params.logId,
		(err: IError, result) => {
			if (err) {
				logger.error('[rest_api::downloadSubmittedExercise::search] : ');
				logger.error(util.inspect(err, {showHidden: false}));
				res.sendStatus(500);
				return;
			}

			const row = result[0];

			if (req.session.admin || row.studentId == req.session.studentId) {
				if (!('encoded' in req.query) && row.originalFile) {
					res.download(path.join(submittedExerciseOriginalPath, row.originalFile), row.name);
				}
				else {
					res.download(path.join(submittedExercisePath, row.fileName), row.name);
				}
			}
			else {
				logger.error('[rest_api::downloadSubmittedExercise::student_id-mismatch]');
				res.sendStatus(401);
			}
		});
}