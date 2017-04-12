import * as crypto from "crypto";
import {Request, Response} from "express";
import * as fs from "fs";
import * as fs_ext from "fs-extra";
import * as iconv from "iconv-lite";
import {createConnection, escape, IConnection, IError} from "mysql";
import * as path from "path";
import {
	docker,
	exerciseSetPath,
	logger,
	submittedExerciseOriginalPath,
	submittedExercisePath,
	submittedHomeworkPath,
	tempPath
} from "../app";
import * as util from "util";
import * as async from "async";

import charsetDetector = require('detect-character-encoding');


const webConfig = JSON.parse(fs.readFileSync('config/web.json', 'utf-8'));
const CLIENT_ID = webConfig.google.clientId;

const GoogleAuth = require('google-auth-library');
const auth = new GoogleAuth;
const OAuth2Client = new auth.OAuth2(CLIENT_ID, '', '');

const dbConfig = JSON.parse(fs.readFileSync('config/database.json', 'utf-8'));
export const dbClient: IConnection = createConnection({
	host: dbConfig.host,
	user: dbConfig.user,
	password: dbConfig.password,
	database: dbConfig.database
});


/**
 * The sign in request api.
 *
 * @method signIn
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export function signIn(req: Request, res: Response) {
	if (req.session.signIn) {
		return res.sendStatus(401);
	}

	const token = req.body.idtoken;

	OAuth2Client.verifyIdToken(
		token,
		CLIENT_ID,
		(e, login) => {
			if (e) {
				// FIXME: error handling
				throw e;
			}

			const payload = login.getPayload();
			const email = payload['email'];

			dbClient.query(
				'SELECT * from email, user where email = "' + email + '" and user.student_id = email.student_id;',
				(err: IError, result) => {
					if (err) {
						// FIXME: error handling
						logger.error('[rest_api::signIn::select] : ');
						logger.error(util.inspect(err, {showHidden: false, depth: null}));
					}

					logger.debug('[signIn]');
					logger.debug(util.inspect(result, {showHidden: false, depth: 1}));

					switch (result.length) {
						case 0:
							res.sendStatus(204);
							break;

						case 1:
							req.session.admin = result[0].is_admin == '1';
							req.session.email = email;
							req.session.name = decodeURIComponent(result[0].name);
							req.session.signIn = true;
							req.session.studentId = result[0].student_id;

							res.sendStatus(202);
							break;

						default:
							res.sendStatus(500);
					}
				});
		});
}

export function signOut(req: Request, res: Response) {
	req.session.admin = false;
	req.session.email = null;
	req.session.name = null;
	req.session.signIn = false;
	req.session.studentId = null;

	return res.sendStatus(202);
}


/**
 * The register request api.
 *
 * @method register
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export function register(req: Request, res: Response) {
	if (req.session.signIn) {
		return res.sendStatus(401);
	}

	const body = req.body;

	const studentId = body.student_id1 + '-' + body.student_id2;
	const name = encodeURIComponent(body.name);
	const idToken = body.id_token;

	OAuth2Client.verifyIdToken(
		idToken,
		CLIENT_ID,
		(e, login) => {
			if (e) {
				// FIXME: error handling
				throw e;
			}

			const payload = login.getPayload();
			const email = payload['email'];
			const nameInGoogle = encodeURIComponent(payload['name']);

			dbClient.query(
				'SELECT * FROM user WHERE student_id = \'' + studentId + '\';',
				(err: IError, selectResult) => {
					if (err || selectResult.length > 1) {
						// FIXME: error handling
						logger.error('[rest_api::register::select] : ');
						logger.error(util.inspect(err, {showHidden: false, depth: null}));
						res.sendStatus(500);
						return;
					}
					else if (selectResult.length == 0) {
						res.sendStatus(204);
						return;
					}

					logger.debug('[register:outer]');
					logger.debug(util.inspect(selectResult, {showHidden: false, depth: 1}));

					dbClient.query(
						'INSERT INTO email VALUES (?,?,?);',
						[studentId, email, nameInGoogle],
						(err: IError, insertResult) => {
							if (err) {
								// FIXME: error handling
								logger.error('[rest_api::register::insert] : ');
								logger.error(util.inspect(err, {showHidden: false, depth: null}));
								res.sendStatus(500);
							}

							logger.debug('[register:inner]');
							logger.debug(util.inspect(insertResult, {showHidden: false, depth: 1}));

							req.session.admin = selectResult[0].is_admin == '1';
							req.session.email = email;
							req.session.name = decodeURIComponent(selectResult[0].name);
							req.session.signIn = true;
							req.session.studentId = selectResult[0].student_id;

							res.sendStatus(201);
						}
					);
				}
			)
		});
}


/**
 * creating a new homework request api.
 *
 * @method createHW
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export function createHW(req: Request, res: Response) {
	if (!req.session.admin) {
		return res.sendStatus(401);
	}

	const name = encodeURIComponent(req.body.name);
	const start_date = req.body.start;
	const end_date = req.body.due;
	const description = req.body.description;

	dbClient.query(
		'INSERT INTO homework(name, start_date, end_date, author_id, author_email, description) VALUES(?,?,?,?,?,?);',
		[name, start_date, end_date, req.session.studentId, req.session.email, description],
		(err: IError, insertResult) => {
			if (err) {
				// FIXME: error handling
				logger.error('[rest_api::createHW::outer_insert] : ');
				logger.error(util.inspect(err, {showHidden: false, depth: null}));
				res.sendStatus(500);
				return;
			}

			logger.debug('[createHW:insert into homework]');
			logger.debug(util.inspect(insertResult, {showHidden: false, depth: 1}));

			const homeworkId = insertResult.insertId;

			const values = [];

			for (let attachment of req.body.attachment) {
				const hwName = encodeURIComponent(attachment.name);
				const extension = attachment.extension;

				values.push([homeworkId, hwName, extension]);
			}

			dbClient.query(
				'INSERT INTO hw_config(homework_id, name, extension) VALUES ' + escape(values) + ';',
				(err: IError, result) => {
					if (err) {
						// FIXME: error handling
						logger.error('[rest_api::createHW::inner_insert] : ');
						logger.error(util.inspect(err, {showHidden: false, depth: null}));
						res.sendStatus(500);
						return;
					}

					logger.debug('[createHW:insert into hw_config]');
					logger.debug(util.inspect(result, {showHidden: false, depth: 1}));
				}
			);


			res.redirect('/homework');
		}
	);
}


/**
 * The attachment upload request api.
 *
 * @method uploadAttach
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export function uploadAttach(req: Request, res: Response) {
	if (!req.session.signIn) {
		return res.sendStatus(401);
	}

	const hash = crypto.createHash('sha512');
	const file = req.files.attachment;
	const hashedName = hash.update(file.data).digest('hex');
	const attachmentId = req.params.attachId;

	dbClient.query(
		'INSERT INTO submit_log(student_id, attachment_id, email, file_name) VALUES (?,?,?,?);',
		[req.session.studentId, attachmentId, req.session.email, hashedName],
		(err: IError, insertResult) => {
			if (err) {
				// FIXME: error handling
				logger.error('[rest_api::uploadAttach::insert] : ');
				logger.error(util.inspect(err, {showHidden: false, depth: null}));
				res.sendStatus(500);
				return;
			}

			logger.debug('[uploadAttach:insert into submit_log]');
			logger.debug(util.inspect(insertResult, {showHidden: false, depth: 1}));

			file.mv(path.join(submittedHomeworkPath, hashedName), (err) => {
				if (err) {
					// FIXME: error handling
					logger.error('[rest_api::uploadAttach::file_move] : ');
					logger.error(util.inspect(err, {showHidden: false, depth: null}));
					res.sendStatus(500);
					return;
				}
			});

			res.sendStatus(202)
		}
	);
}


/**
 * Check uploaded name is already exist.
 *
 * @method hwNameChecker
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export function hwNameChecker(req: Request, res: Response) {
	if (!req.session.admin) {
		return res.sendStatus(401);
	}

	dbClient.query(
		'SELECT * FROM homework WHERE name = ?;', req.query.name,
		(err: IError, searchResult) => {
			if (err) {
				// FIXME: error handling
				logger.error('[rest_api::hwNameChecker::select] : ');
				logger.error(util.inspect(err, {showHidden: false, depth: null}));
				res.sendStatus(500);
				return;
			}

			res.sendStatus(searchResult.length == 0 ? 200 : 409);
		}
	);
}


/**
 * Run and return result uploaded exercise
 *
 * @method runExercise
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export function runExercise(req: Request, res: Response) {
	if (!req.session.signIn) {
		return res.sendStatus(401);
	}

	const hash = crypto.createHash('sha512');
	const file = req.files.attachment;
	const attachId = req.params.attachId;

	const studentId = req.session.studentId;

	const encodingInfo: { encoding: string, confidence: number } = charsetDetector(file.data);
	logger.debug(util.inspect(encodingInfo, {showHidden: false, depth: 1}));


	let hashedOriginal = crypto.createHash('sha512').update(file.data).digest('hex');


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
		fs.writeFile(path.join(submittedExerciseOriginalPath, hashedOriginal), file.data, {mode: 0o400},
			(err: NodeJS.ErrnoException) => {
				if (err) {
					// FIXME: error handling
					logger.error('[rest_api::runExercise::writeOriginalFile] : ');
					logger.error(util.inspect(err, {showHidden: false, depth: null}));
				}
			});
	}


	fs.writeFile(path.join(submittedExercisePath, hashedName), fileContent, {mode: 0o400}, (err: NodeJS.ErrnoException) => {
		if (err) {
			// FIXME: error handling
			logger.error('[rest_api::runExercise::writeFile] : ');
			logger.error(util.inspect(err, {showHidden: false, depth: null}));
		}
	});


	// get information of this exercise by given id (attachId)
	dbClient.query(
		'SELECT name, extension, test_set_size FROM exercise_config WHERE id = ?;', attachId,
		(err: IError, searchResult) => {
			if (err) {
				// FIXME: error handling
				logger.error('[rest_api::runExercise::select] : ');
				logger.error(util.inspect(err, {showHidden: false, depth: null}));
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
					testSetSize: searchResult[0].test_set_size
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
						// FIXME: error handling
						logger.error('[rest_api::runExercise::insert] : ');
						logger.error(util.inspect(err, {showHidden: false, depth: null}));
						res.sendStatus(500);
						return;
					}

					logger.debug('[runExercise:insert into exercise_log]');
					logger.debug(util.inspect(insertResult, {showHidden: false, depth: 1}));

					judgeExercise(res, insertResult.insertId, attachId, studentId, outputPath, sourcePath);
				}
			);
		}
	);
}


/**
 * Rejudge unresolved exercise
 *
 * @method resolve
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export function resolve(req: Request, res: Response) {
	if (!req.session.admin) {
		return res.sendStatus(401);
	}

	dbClient.query(
		'SELECT exercise_log.id, exercise_log.attachment_id AS `attachId`, exercise_log.student_id AS `studentId`, file_name AS `fileName` ' +
		'FROM exercise_log ' +
		'    LEFT JOIN exercise_result ON exercise_result.log_id = exercise_log.id ' +
		'WHERE exercise_result.id IS NULL;',
		(err: IError, searchList) => {
			if (err) {
				// FIXME: error handling
				logger.error('[rest_api::resolve::search] : ');
				logger.error(util.inspect(err, {showHidden: false, depth: null}));
				res.sendStatus(500);
				return;
			}

			for (const log of searchList) {
				// get information of this exercise by given id (attachId)
				dbClient.query(
					'SELECT name, extension, test_set_size FROM exercise_config WHERE id = ?;', log.attachId,
					(err: IError, exerciseSetting) => {
						if (err) {
							// FIXME: error handling
							logger.error('[rest_api::resolve::select] : ');
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
								testSetSize: exerciseSetting[0].test_set_size
							}),
							{mode: 0o400}
						);

						// copy given source code to shared folder
						fs_ext.copySync(
							path.join(submittedExercisePath, log.fileName),
							path.join(sourcePath, exerciseSetting[0].name));

						judgeExercise(null, log.id, log.attachId, log.studentId, outputPath, sourcePath);
					});
			}
		});

	return res.sendStatus(200);
}

function judgeExercise(res: Response, logId: number, attachId: number, studentId: string,
					   outputPath: string, sourcePath: string) {
	const inputPath = path.join(exerciseSetPath, attachId.toString(), 'input');
	const answerPath = path.join(exerciseSetPath, attachId.toString(), 'output');

	docker.run(
		'judge_server',
		['bash', './judge.sh'],
		[{
			write: (message: NodeBuffer) => {
				logger.debug('[rest_api::runExercise::docker.stdout]');
				logger.debug(message.toString());
			}
		}, {
			write: (message: NodeBuffer) => {
				logger.error('[rest_api::runExercise::docker.stderr]');
				logger.error(message.toString());
			}
		}], // TODO: redirect these
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
		(err, data, container) => {
			if (err) {
				// FIXME: error handling
				logger.error('[rest_api::runExercise::docker_run] : ');
				logger.error(util.inspect(err, {showHidden: false, depth: null}));
				res.sendStatus(500);
				return;
			}

			handleResult(res, logId, attachId, studentId, answerPath, inputPath, outputPath);

			// remove input temporary folder
			fs_ext.remove(sourcePath, (err: Error) => {
				if (err) {
					// FIXME: error handling
					logger.error('[rest_api::judgeExercise::temp_remove] : ');
					logger.error(util.inspect(err, {showHidden: false, depth: null}));
				}
			});

			container.remove();
		});
}


function handleResult(res: Response, logId: number, attachId: number, studentId: string,
					  answerPath: string, inputPath: string, outputPath: string) {
	const resultFile = path.join(outputPath, 'result.json');

	fs.exists(resultFile, (exists: boolean) => {
		// if result.js is exist, it means that this judge was successful
		if (exists) {
			fs.readFile(resultFile, 'UTF-8', (err: NodeJS.ErrnoException, data: Buffer) => {
				const result: {
					isMatched: boolean, errorLog?: string, returnCode?: number,
					inputIndex?: number, userOutput?: string
				} = JSON.parse(data.toString());

				// remove output temporary folder
				fs_ext.remove(outputPath, (err: Error) => {
					if (err) {
						// FIXME: error handling
						logger.error('[rest_api::handleResult::temp_remove] : ');
						logger.error(util.inspect(err, {showHidden: false, depth: null}));
						res.sendStatus(500);
					}
				});


				// the judge was correct
				if (result.isMatched) {
					if (res) res.sendStatus(200);

					dbClient.query(
						'INSERT INTO exercise_result (log_id, type, runtime_error) VALUE (?, ?, ?);',
						[logId, 0, result.errorLog],
						(err) => {
							if (err) {
								// FIXME: error handling
								logger.error('[rest_api::handleResult::insert_judge_correct] : ');
								logger.error(util.inspect(err, {showHidden: false, depth: null}));
							}
						});

					if (result.errorLog) {
						logger.error('[rest_api::handleResult::insert_judge_correct-found_error] ' + logId);
					}

					dbClient.query(
						'INSERT IGNORE INTO exercise_quick_result (attach_id, student_id, result) VALUE (?, ?, ?);',
						[attachId, studentId, true],
						(err) => {
							if (err) {
								// FIXME: error handling
								logger.error('[rest_api::handleResult::insert_judge_correct] : ');
								logger.error(util.inspect(err, {showHidden: false, depth: null}));
							}
						}
					)
				}

				// or if runtime exceptions occur
				else if ('returnCode' in result) {
					// timeout
					if (result.returnCode == 124) {
						fs.readFile(path.join(inputPath, result.inputIndex + '.in'), 'UTF-8',
							(err: NodeJS.ErrnoException, data: Buffer) => {
								if (err) {
									// FIXME: error handling
									logger.error('[rest_api::handleResult::read_file::read_file:timeout] : ');
									logger.error(util.inspect(err, {showHidden: false, depth: null}));
									if (res) res.sendStatus(500);
									return;
								}

								if (res) res.status(410).json({input: data.toString()});
							});

						dbClient.query(
							'INSERT INTO exercise_result (log_id, type, return_code, unmatched_index) VALUE (?, ?, ?, ?);',
							[logId, 3, result.returnCode, result.inputIndex],
							(err) => {
								if (err) {
									// FIXME: error handling
									logger.error('[rest_api::handleResult::insert_judge_timeout] : ');
									logger.error(util.inspect(err, {showHidden: false, depth: null}));
								}
							});
					}
					// runtime error
					else {
						fs.readFile(path.join(inputPath, result.inputIndex + '.in'), 'UTF-8',
							(err: NodeJS.ErrnoException, data: Buffer) => {
								if (err) {
									// FIXME: error handling
									logger.error('[rest_api::handleResult::read_file::read_file:runtimeError] : ');
									logger.error(util.inspect(err, {showHidden: false, depth: null}));
									if (res) res.sendStatus(500);
									return;
								}

								if (res) res.status(412).json({
									input: data.toString(),
									errorLog: result.errorLog,
									returnCode: result.returnCode
								});
							});

						dbClient.query(
							'INSERT INTO exercise_result (log_id, type, return_code, runtime_error, unmatched_index) VALUE (?, ?, ?, ?, ?);',
							[logId, 4, result.returnCode, result.errorLog, result.inputIndex],
							(err) => {
								if (err) {
									// FIXME: error handling
									logger.error('[rest_api::handleResult::insert_judge_runtime_error] : ');
									logger.error(util.inspect(err, {showHidden: false, depth: null}));
								}
							});
					}
				}

				// or it was incorrect
				else {
					fs.readFile(path.join(answerPath, result.inputIndex + '.out'), 'UTF-8',
						(err: NodeJS.ErrnoException, data: Buffer) => {
							if (err) {
								// FIXME: error handling
								logger.error('[rest_api::handleResult::read_file] : ');
								logger.error(util.inspect(err, {showHidden: false, depth: null}));
								if (res) res.sendStatus(500);
								return;
							}

							const answerOutput = data.toString();

							fs.readFile(path.join(inputPath, result.inputIndex + '.in'), 'UTF-8',
								(err: NodeJS.ErrnoException, data: Buffer) => {
									if (err) {
										// FIXME: error handling
										logger.error('[rest_api::handleResult::read_file::read_file] : ');
										logger.error(util.inspect(err, {showHidden: false, depth: null}));
										res.sendStatus(500);
										return;
									}

									if (res) res.status(406).json({
										userOutput: result.userOutput,
										answerOutput: answerOutput,
										input: data.toString()
									});
								});
						});

					dbClient.query(
						'INSERT INTO exercise_result (log_id, type, unmatched_index, unmatched_output, runtime_error) VALUE (?, ?, ?, ?, ?);',
						[logId, 1, result.inputIndex, result.userOutput, result.errorLog],
						(err) => {
							if (err) {
								// FIXME: error handling
								logger.error('[rest_api::handleResult::insert_judge_incorrect] : ');
								logger.error(util.inspect(err, {showHidden: false, depth: null}));
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
					fs.readFile(errorLogFile, (err: NodeJS.ErrnoException, data: Buffer) => {
						if (err) {
							// FIXME: error handling
							logger.error('[rest_api::handleResult::read_file] : ');
							logger.error(util.inspect(err, {showHidden: false, depth: null}));
							if (res) res.sendStatus(500);
							return;
						}

						// remove output temporary folder
						fs_ext.remove(outputPath, (err: Error) => {
							if (err) {
								// FIXME: error handling
								logger.error('[rest_api::handleResult::remove_file] : ');
								logger.error(util.inspect(err, {showHidden: false, depth: null}));
							}
						});


						const errorStr = data.toString('UTF-8');
						if (res) res.status(417).json({errorMsg: errorStr});


						dbClient.query(
							'INSERT INTO exercise_result(log_id, type, script_error) VALUE(?, ?, ?);',
							[logId, 5, errorStr],
							(err) => {
								if (err) {
									// FIXME: error handling
									logger.error('[rest_api::handleResult::insert_script_error] : ');
									logger.error(util.inspect(err, {showHidden: false, depth: null}));
								}
							});
					});
				}
				else {
					const compileErrorFile = path.join(outputPath, 'compile_error.log');

					fs.exists(compileErrorFile, (exists: boolean) => {
						// compile error
						if (exists) {
							fs.readFile(compileErrorFile, (err: NodeJS.ErrnoException, data: Buffer) => {
								if (err) {
									// FIXME: error handling
									logger.error('[rest_api::handleResult::read_file] : ');
									logger.error(util.inspect(err, {showHidden: false, depth: null}));
									if (res) res.sendStatus(500);
									return;
								}

								// remove output temporary folder
								fs_ext.remove(outputPath, (err: Error) => {
									if (err) {
										// FIXME: error handling
										logger.error('[rest_api::handleResult::remove_file] : ');
										logger.error(util.inspect(err, {showHidden: false, depth: null}));
									}
								});

								const errorStr = data.toString('UTF-8');

								if (res) res.status(400).json({errorMsg: errorStr});


								dbClient.query(
									'INSERT INTO exercise_result(log_id, type, compile_error) VALUE(?,?,?);',
									[logId, 2, errorStr],
									(err) => {
										if (err) {
											// FIXME: error handling
											logger.error('[rest_api::handleResult::insert_compile_error] : ');
											logger.error(util.inspect(err, {showHidden: false, depth: null}));
										}
									});
							})
						}

						// something else
						else {
							// FIXME: error handling
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
 * Send history data.
 *
 * @method historyList
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export function historyList(req: Request, res: Response) {
	if (!req.session.signIn) return res.sendStatus(401);

	if (!('t' in req.query)) {
		req.query.t = '3';
	}

	const query: {
		hw: Array<string> | string,
		ex: Array<string> | string,
		r: Array<string> | string,
		e: Array<string> | string,
		u: Array<string> | string,
		t: number
	} = req.query;

	let commonQuery = '';

	if (req.session.admin && query.u) commonQuery += 'student_id IN (' + escape(query.u) + ')';
	else commonQuery += 'student_id=' + escape(req.session.studentId);
	if (query.e) commonQuery += ' AND email IN (' + escape(query.e) + ')';

	let tasks = [];

	if (query.t & 2) {
		let exerciseQuery = commonQuery;
		if (query.ex) exerciseQuery += ' AND attachment_id IN (' + escape(query.ex) + ')';
		if (query.r) exerciseQuery += ' AND type IN (' + escape(query.r) + ')';

		tasks.push((callback) => {
			dbClient.query(
				'SELECT exercise_log.id, student_id AS `studentId`, email, submitted AS `timestamp`, name AS `fileName`, extension, type AS `result`, "Exercise" AS `category` ' +
				'FROM exercise_log ' +
				'    JOIN exercise_config ON exercise_log.attachment_id = exercise_config.id ' +
				'    LEFT JOIN exercise_result ON exercise_log.id = exercise_result.log_id ' +
				'WHERE ' + exerciseQuery,
				callback);
		});
	}


	if (query.t & 1) {
		let homeworkQuery = commonQuery;
		if (query.hw) homeworkQuery += ' AND attachment_id IN (' + escape(query.hw) + ')';

		tasks.push((callback) => {
			dbClient.query(
				'SELECT submit_log.id, student_id AS `studentId`, email, submitted AS `timestamp`, name AS `fileName`, extension, "Homework" AS `category` ' +
				'FROM submit_log ' +
				'    JOIN hw_config ON submit_log.attachment_id = hw_config.id ' +
				'WHERE ' + homeworkQuery,
				callback);
		});
	}

	async.parallel(tasks, (err, results) => {
		if (err) {
			logger.error('[rest_api::historyList::search] : ');
			logger.error(util.inspect(err, {showHidden: false, depth: null}));
			res.sendStatus(500);
			return;
		}

		if (results.length == 2) res.json(results[0][0].concat(results[1][0]));
		else res.json(results[0][0]);
	});
}


/**
 * Send judge result of exercise data.
 *
 * @method judgeResult
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export function judgeResult(req: Request, res: Response) {
	if (!req.session.signIn) return 401;

	dbClient.query(
		'SELECT student_id, type, compile_error, unmatched_index, unmatched_output, return_code, runtime_error, script_error ' +
		'FROM exercise_log JOIN exercise_result ON exercise_log.id = exercise_result.log_id ' +
		'WHERE log_id = ?',
		req.params.logId,
		(err: IError, searchResult) => {
			if (err) {
				logger.error('[rest_api::judgeResult::search] : ');
				logger.error(util.inspect(err, {showHidden: false, depth: null}));
				res.sendStatus(500);
				return;
			}

			console.log(searchResult);
			// TODO: implement me
		});
}


/**
 * Send exercise file.
 *
 * @method getExercise
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export function getExercise(req: Request, res: Response) {
	if (!req.session.signIn) return res.sendStatus(401);

	dbClient.query(
		'SELECT student_id AS `studentId`, file_name AS `fileName`, original_file AS `originalFile`, name ' +
		'FROM exercise_log JOIN exercise_config ON exercise_log.attachment_id = exercise_config.id ' +
		'WHERE exercise_log.id=?',
		req.params.logId,
		(err: IError, result) => {
			if (err) {
				logger.error('[rest_api::getExercise::search] : ');
				logger.error(util.inspect(err, {showHidden: false, depth: null}));
				res.sendStatus(500);
				return;
			}

			const row = result[0];

			if (req.session.admin || row.studentId == req.session.studentId) {
				if (row.originalFile) {
					res.download(path.join(submittedExerciseOriginalPath, row.originalFile), row.name);
				}
				else {
					res.download(path.join(submittedExercisePath, row.fileName), row.name);
				}
			}
			else {
				logger.error('[rest_api::getExercise::student_id-mismatch]');
				res.sendStatus(401);
			}
		});
}


/**
 * Send homework file.
 *
 * @method getHomework
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export function getHomework(req: Request, res: Response) {
	if (!req.session.signIn) return res.sendStatus(401);

	dbClient.query(
		'SELECT student_id AS `studentId`, file_name AS `fileName`, name ' +
		'FROM submit_log JOIN hw_config ON submit_log.attachment_id = hw_config.id ' +
		'WHERE submit_log.id=?',
		req.params.logId,
		(err: IError, result) => {
			if (err) {
				// FIXME: error handling
				logger.error('[rest_api::getHomework::search] : ');
				logger.error(util.inspect(err, {showHidden: false, depth: null}));
				res.sendStatus(500);
				return;
			}

			const row = result[0];

			if (req.session.admin || row.studentId == req.session.studentId) {
				res.download(path.join(submittedHomeworkPath, row.fileName), row.name);
			}
			else {
				logger.error('[rest_api::getHomework::student_id-mismatch]');
				res.sendStatus(401);
			}
		});
}