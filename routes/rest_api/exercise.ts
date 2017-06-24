import * as async from "async";
import * as crypto from "crypto";
import {Request, Response} from "express";
import * as fs from "fs";
import * as fs_ext from "fs-extra";
import * as iconv from "iconv-lite";
import {createConnection, IConnection, IError} from "mysql";
import * as path from "path";
import * as util from "util";
import {exerciseSetPath, logger, submittedExerciseOriginalPath, submittedExercisePath, tempPath} from "../../app";
import {JudgeResult, ResultEnum, runJudge} from "./judge";

const charsetDetector = require('detect-character-encoding');

const dbConfig = JSON.parse(fs.readFileSync('config/database.json', 'utf-8'));
const dbClient: IConnection = createConnection({
	host: dbConfig.host,
	user: dbConfig.user,
	password: dbConfig.password,
	database: dbConfig.database
});


/**
 * Run and return result uploaded exercise
 *
 * @method upload
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export function upload(req: Request, res: Response) {
	if (!req.session.signIn) return res.sendStatus(401);

	const hash = crypto.createHash('sha512');
	const file = (<any>req).files.attachment;
	const attachId = req.params.attachId;
	const studentId = req.session.studentId;

	const encodingInfo: { encoding: string, confidence: number } = charsetDetector(file.data);
	logger.debug(util.inspect(encodingInfo, {showHidden: false, depth: 1}));


	let hashedOriginal: string = crypto.createHash('sha512').update(file.data).digest('hex');


	let fileContent: string;
	if (encodingInfo.encoding == 'UTF-8') {
		fileContent = iconv.decode(file.data, encodingInfo.encoding);
	}
	else {
		fileContent = iconv.decode(file.data, 'EUC-KR');
	}

	const hashedName = hash.update(fileContent).digest('hex');


	if (hashedName == hashedOriginal) {
		hashedOriginal = undefined;
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
		'SELECT name, extension, test_set_size, input_through_arg, no_compile FROM exercise_config WHERE id = ?;',
		attachId,
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

			if (searchResult[0].no_compile) {
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

						const inputPath = path.join(exerciseSetPath, attachId.toString(), 'input');
						const answerPath = path.join(exerciseSetPath, attachId.toString(), 'output');

						runJudge(outputPath, sourcePath, inputPath, answerPath,
							(err: Error, code: ResultEnum, result: JudgeResult) => {
								async.parallel([
									() => sendResult(res, code, result, inputPath, answerPath, insertResult.insertId),
									() => storeResult(code, result, insertResult.insertId)
								]);
							});
					}
				);
			}
			else {
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

						res.sendStatus(200);

						dbClient.query(
							'INSERT INTO exercise_result (log_id, type) VALUE (?, ?);',
							[insertResult.insertId, ResultEnum.correct],
							(err) => {
								if (err) {
									logger.error('[rest_api::uploadExercise::insert_judge_correct] : ');
									logger.error(util.inspect(err, {showHidden: false}));
								}
							});
					}
				);
			}
		}
	);
}


function sendResult(res: Response, code: ResultEnum, result: JudgeResult,
					inputPath: string, answerPath: string, logId: number) {
	switch (code) {
		case ResultEnum.serverError:
			res.status(500).json({id: logId});
			break;

		case ResultEnum.scriptError:
			res.status(417).json({errorMsg: result.errorStr});
			break;

		case ResultEnum.compileError:
			res.status(400).json({errorMsg: result.errorStr});
			break;

		case ResultEnum.incorrect:
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
					logger.error('[rest_api::sendResult::incorrect::read_file] : ');
					logger.error(util.inspect(err, {showHidden: false}));
					res.status(500).json({id: logId});
				}
				else {
					res.status(406).json({
						userOutput: result.userOutput,
						answerOutput: data[0],
						input: data[1]
					})
				}
			});
			break;

		case ResultEnum.runtimeError:
			fs.readFile(path.join(inputPath, result.inputIndex + '.in'), 'UTF-8',
				(err: NodeJS.ErrnoException, data: string) => {
					if (err) {
						logger.error('[rest_api::uploadExercise::read_file:runtimeError] : ');
						logger.error(util.inspect(err, {showHidden: false}));
						res.status(500).json({id: logId});
					}
					else {
						res.status(412).json({
							input: data,
							errorLog: result.errorLog,
							returnCode: result.returnCode
						})
					}
				});
			break;

		case ResultEnum.timeout:
			fs.readFile(path.join(inputPath, result.inputIndex + '.in'), 'UTF-8',
				(err: NodeJS.ErrnoException, data: string) => {
					if (err) {
						logger.error('[rest_api::uploadExercise::read_file:timeout] : ');
						logger.error(util.inspect(err, {showHidden: false}));
						res.status(500).json({id: logId});
					}
					else
						res.status(410).json({input: data});
				});
			break;

		case ResultEnum.correct:
			res.sendStatus(200);
			break;
	}
}


function storeResult(code: ResultEnum, result: JudgeResult, logId: number) {
	switch (code) {
		case ResultEnum.compileError:
			dbClient.query(
				'INSERT INTO exercise_result(log_id, type, compile_error) VALUE(?,?,?);',
				[logId, code, result.errorStr],
				(err) => {
					if (err) {
						logger.error('[rest_api::handleResult::insert_compile_error] : ');
						logger.error(util.inspect(err, {showHidden: false}));
					}
				});
			break;

		case ResultEnum.correct:
			dbClient.query(
				'INSERT INTO exercise_result (log_id, type, runtime_error) VALUE (?, ?, ?);',
				[logId, code, result.errorLog],
				(err) => {
					if (err) {
						logger.error('[rest_api::handleResult::insert_judge_correct] : ');
						logger.error(util.inspect(err, {showHidden: false}));
					}
				});

			if (result.errorLog) {
				logger.error('[rest_api::handleResult::insert_judge_correct-found_error] ' + logId);
			}
			break;

		case ResultEnum.timeout:
			dbClient.query(
				'INSERT INTO exercise_result (log_id, type, return_code, failed_index) VALUE (?, ?, ?, ?);',
				[logId, code, result.returnCode, result.inputIndex],
				(err) => {
					if (err) {
						logger.error('[rest_api::handleResult::insert_judge_timeout] : ');
						logger.error(util.inspect(err, {showHidden: false}));
					}
				});
			break;

		case ResultEnum.runtimeError:
			dbClient.query(
				'INSERT INTO exercise_result (log_id, type, return_code, runtime_error, failed_index) VALUE (?, ?, ?, ?, ?);',
				[logId, code, result.returnCode, result.errorLog, result.inputIndex],
				(err) => {
					if (err) {
						logger.error('[rest_api::handleResult::insert_judge_runtime_error] : ');
						logger.error(util.inspect(err, {showHidden: false}));
					}
				});
			break;

		case ResultEnum.incorrect:
			dbClient.query(
				'INSERT INTO exercise_result (log_id, type, failed_index, user_output, runtime_error) VALUE (?, ?, ?, ?, ?);',
				[logId, code, result.inputIndex, result.userOutput, result.errorLog],
				(err) => {
					if (err) {
						logger.error('[rest_api::handleResult::insert_judge_incorrect] : ');
						logger.error(util.inspect(err, {showHidden: false}));
					}
				});
			break;

		case ResultEnum.scriptError:
			dbClient.query(
				'INSERT INTO exercise_result(log_id, type, script_error) VALUE(?, ?, ?);',
				[logId, code, result.errorStr],
				(err) => {
					if (err) {
						logger.error('[rest_api::handleResult::insert_script_error] : ');
						logger.error(util.inspect(err, {showHidden: false}));
					}
				});
			break;
	}
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
				// TODO: adjust async pattern
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

						const inputPath = path.join(exerciseSetPath, log.attachId.toString(), 'input');
						const answerPath = path.join(exerciseSetPath, log.attachId.toString(), 'output');

						runJudge(outputPath, sourcePath, inputPath, answerPath, (err: Error, code: ResultEnum, result: JudgeResult) => {
							storeResult(code, result, log.id);
						});
					});
			}
		});

	return res.sendStatus(200);
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
				case ResultEnum.correct:
					res.sendStatus(200);
					break;

				case ResultEnum.incorrect:
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

				case ResultEnum.compileError:
					res.status(400).json({errorMsg: result.compile_error});
					break;

				case ResultEnum.timeout:
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

				case ResultEnum.runtimeError:
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

				case ResultEnum.scriptError:
					res.status(417).json({errorMsg: result.script_error});
					break;
			}
		});
}


/**
 * Send exercise file.
 *
 * @method downloadSingle
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export function downloadSingle(req: Request, res: Response) {
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