import * as crypto from "crypto";
import {Request, Response} from "express";
import * as fs from "fs";
import * as fs_ext from "fs-extra";
import * as iconv from "iconv-lite";
import {createConnection, escape, IConnection, IError} from "mysql";
import * as path from "path";
import {docker, exerciseSetPath, logger, tempPath} from "../app";
import * as util from "util";
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

			file.mv(path.join('media', 'homework', hashedName), (err) => {
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
	let fileContent: Buffer | string = file.data;
	const attachId = req.params.attachId;

	const encodingInfo: { encoding: string, confidence: number } = charsetDetector(fileContent);

	logger.debug(util.inspect(encodingInfo, {showHidden: false, depth: 1}));

	if (encodingInfo.encoding == 'UTF-8') {
		fileContent = iconv.decode(file.data, encodingInfo.encoding);
	}
	else {
		fileContent = iconv.decode(file.data, 'EUC-KR');
	}

	const hashedName = hash.update(fileContent).digest('hex');


	fs.writeFile(path.join('media', 'exercise', hashedName), fileContent, {mode: 0o600}, (err: NodeJS.ErrnoException) => {
		if (err) {
			// FIXME: error handling
			logger.error('[rest_api::runExercise::writeFile] : ');
			logger.error(util.inspect(err, {showHidden: false, depth: null}));
			res.sendStatus(500);
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
			const sourcePath = fs.mkdtempSync(path.join(tempPath, req.session.studentId + '_'));
			// a temporarily created shared path that will contain output
			const outputPath = fs.mkdtempSync(path.join(tempPath, req.session.studentId + '_'));


			const inputPath = path.join(exerciseSetPath, attachId, 'input');
			const answerPath = path.join(exerciseSetPath, attachId, 'output');


			// write config file of this judge to shared folder
			fs.writeFile(
				path.join(sourcePath, 'config.json'),
				JSON.stringify({
					sourceName: searchResult[0].name,
					extension: searchResult[0].extension,
					test_set: searchResult[0].test_set_size
				}),
				{mode: 0o666}
			);

			// copy given source code to shared folder
			fs.writeFileSync(path.join(sourcePath, searchResult[0].name), fileContent, {mode: 0o600});


			dbClient.query(
				'INSERT INTO exercise_log (student_id, attachment_id, email, file_name) VALUE (?, ?, ?, ?);',
				[req.session.studentId, attachId, req.session.email, hashedName],
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


					const logId = insertResult.insertId;

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


							const resultFile = path.join(outputPath, 'result.json');

							fs.exists(resultFile, (exists: boolean) => {
								// if result.js is exist, it means that this judge was successful
								if (exists) {
									const result = JSON.parse(fs.readFileSync(resultFile, 'utf-8'));

									// remove output temporary folder
									fs_ext.remove(outputPath, (err: Error) => {
										if (err) {
											// FIXME: error handling
											logger.error('[rest_api::runExercise::temp_remove] : ');
											logger.error(util.inspect(err, {showHidden: false, depth: null}));
											res.sendStatus(500);
										}
									});


									// the judge was correct
									if (result.isMatched) {
										res.sendStatus(200);

										dbClient.query(
											'INSERT INTO exercise_result (log_id, result) VALUE (?,?);',
											[logId, true],
											(err, row) => {
												if (err) {
													// FIXME: error handling
													logger.error('[rest_api::runExercise::insert_judge_correct] : ');
													logger.error(util.inspect(err, {showHidden: false, depth: null}));
													res.sendStatus(500);
												}
											});

										dbClient.query(
											'INSERT IGNORE INTO exercise_quick_result (attach_id, student_id, result) VALUE (?, ?, ?);',
											[attachId, req.session.studentId, true],
											(err, row) => {
												if (err) {
													// FIXME: error handling
													logger.error('[rest_api::runExercise::insert_judge_correct] : ');
													logger.error(util.inspect(err, {showHidden: false, depth: null}));
													res.sendStatus(500);
												}
											}
										)
									}

									// or it was incorrect
									else {
										dbClient.query(
											'INSERT INTO exercise_result (log_id, result, unmatched_index, unmatched_output) VALUE (?, ?, ?, ?);',
											[logId, result.isMatched, result.unmatchedIndex, result.unmatchedOutput],
											(err, row) => {
												if (err) {
													// FIXME: error handling
													logger.error('[rest_api::runExercise::insert_judge_incorrect] : ');
													logger.error(util.inspect(err, {showHidden: false, depth: null}));
													res.sendStatus(500);
												}
											});

										fs.readFile(
											path.join(answerPath, result.unmatchedIndex + '.out'),
											(err: NodeJS.ErrnoException, data: Buffer) => {
												if (err) {
													// FIXME: error handling
													logger.error('[rest_api::runExercise::read_file] : ');
													logger.error(util.inspect(err, {showHidden: false, depth: null}));
													res.sendStatus(500);
													return;
												}

												res.setHeader('Content-Type', 'application/json');
												res.status(406).send(JSON.stringify({
													unmatchedIndex: result.unmatchedIndex,
													unmatchedOutput: result.unmatchedOutput,
													answerOutput: data.toString(),
													input: fs.readFileSync(path.join(inputPath, result.unmatchedIndex + '.in'), 'utf-8')
												}));
											});
									}
								}

								// or it can be compile error or internal server error
								else {
									const compileErrorFile = path.join(outputPath, 'compile_error.log');

									// remove output temporary folder
									fs_ext.remove(outputPath, (err: Error) => {
										if (err) {
											// FIXME: error handling
											logger.error('[rest_api::runExercise::remove_file] : ');
											logger.error(util.inspect(err, {showHidden: false, depth: null}));
											res.sendStatus(500);
										}
									});

									fs.exists(compileErrorFile, (exists: boolean) => {
										// compile error
										if (exists) {
											fs.readFile(compileErrorFile, (err: NodeJS.ErrnoException, data: Buffer) => {
												if (err) {
													// FIXME: error handling
													logger.error('[rest_api::runExercise::read_file] : ');
													logger.error(util.inspect(err, {showHidden: false, depth: null}));
													res.sendStatus(500);
													return;
												}

												const errorStr = data.toString();

												res.setHeader('Content-Type', 'application/json');
												res.status(400).send(JSON.stringify({errorMsg: errorStr}));


												dbClient.query(
													'INSERT INTO exercise_result(log_id, result, error_msg) VALUE(?,?,?);',
													[logId, false, errorStr],
													(err, row) => {
														if (err) {
															// FIXME: error handling
															logger.error('[rest_api::runExercise::insert_compile_error] : ');
															logger.error(util.inspect(err, {
																showHidden: false,
																depth: null
															}));
															res.sendStatus(500);
														}
													})
											})
										}
										// something else
										else {
											// FIXME: error handling
											logger.error('[rest_api::runExercise::something_else]');
											res.sendStatus(500);
										}
									})
								}
							});


							// remove input temporary folder
							fs_ext.remove(sourcePath, (err: Error) => {
								if (err) {
									// FIXME: error handling
									logger.error('[rest_api::runExercise::temp_remove] : ');
									logger.error(util.inspect(err, {showHidden: false, depth: null}));
									res.sendStatus(500);
								}
							});

							container.remove();
						});
				}
			);
		}
	);
}
