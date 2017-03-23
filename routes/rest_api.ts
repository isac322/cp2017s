import * as crypto from "crypto";
import {Request, Response} from "express";
import * as fs from "fs";
import * as fs_ext from "fs-extra";
import {createConnection, escape, IConnection, IError} from "mysql";
import * as path from "path";
import {docker, exerciseSetPath, tempPath} from "../app";


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
						console.error('[rest_api::signIn::select] : ', err);
					}

					console.log('\n[signIn]');
					console.log(result);
					console.log();

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
					if (err || selectResult.length != 1) {
						// FIXME: error handling
						console.error('[rest_api::register::select] : ', err);
						res.sendStatus(500);
						return;
					}

					console.log('\n[register:outer]');
					console.log(selectResult);
					console.log();

					// TODO: check not listed student exception

					dbClient.query(
						'INSERT INTO email VALUES (?,?,?);',
						[studentId, email, nameInGoogle],
						(err: IError, insertResult) => {
							if (err) {
								// FIXME: error handling
								console.error('[rest_api::register::insert] : ', err);
								res.sendStatus(500);
							}

							console.log('\n[register:inner]');
							console.log(insertResult);
							console.log();

							req.session.admin = selectResult[0].is_admin == '1';
							req.session.email = email;
							req.session.name = decodeURIComponent(selectResult[0].name);
							req.session.signIn = true;
							req.session.studentId = selectResult[0].student_id;

							return res.redirect('/');
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
				console.error('[rest_api::createHW::outer_insert] : ', err);
				res.sendStatus(500);
				return;
			}

			console.log('\n[createHW:insert into homework]');
			console.log(insertResult);
			console.log();

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
						console.error('[rest_api::createHW::inner_insert] : ', err);
						res.sendStatus(500);
						return;
					}

					console.log('\n[createHW:insert into hw_config]');
					console.log(result);
					console.log();
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
		'SELECT homework.end_date ' +
		'FROM homework JOIN hw_config ' +
		'     ON hw_config.homework_id = homework.homework_id ' +
		'WHERE hw_config.id = ?;',
		attachmentId,
		(err: IError, searchResult) => {
			if (err) {
				console.log(err);
			}

			console.log(searchResult);
			console.log(searchResult[0].end_date);
			console.log(typeof searchResult[0].end_date);

			// TODO: if this upload already past deadline, discard the upload
		}
	);

	dbClient.query(
		'INSERT INTO submit_log(student_id, attachment_id, email, file_name) VALUES (?,?,?,?);',
		[req.session.studentId, attachmentId, req.session.email, hashedName],
		(err: IError, insertResult) => {
			if (err) {
				// FIXME: error handling
				console.error('[rest_api::uploadAttach::insert] : ', err);
				res.sendStatus(500);
				return;
			}

			console.log('\n[uploadAttach:insert into submit_log]');
			console.log(insertResult);
			console.log();

			file.mv(path.join('media', 'homework', hashedName), (err) => {
				if (err) {
					// FIXME: error handling
					console.error('[rest_api::uploadAttach::file_move] : ', err);
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
				console.error('[rest_api::hwNameChecker::select] : ', err);
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
	const hashedName = hash.update(file.data).digest('hex');
	const attachId = req.params.attachId;


	file.mv(path.join('media', 'exercise', hashedName), (err) => {
		if (err) {
			// FIXME: error handling
			console.error('[rest_api::runExercise::file_move] : ', err);
			res.sendStatus(500);
			return;
		}
	});


	// get information of this exercise by given id (attachId)
	dbClient.query(
		'SELECT name, extension, test_set_size FROM exercise_config WHERE id = ?;', attachId,
		(err: IError, searchResult) => {
			if (err) {
				// FIXME: error handling
				console.error('[rest_api::runExercise::select] : ', err);
				res.sendStatus(500);
				return;
			} else if (searchResult.length > 1) {
				console.error('[rest_api::runExercise] search result\'s length is higher than 1');
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
			fs.writeFileSync(path.join(sourcePath, searchResult[0].name), file.data, {mode: 0o600});


			dbClient.query(
				'INSERT INTO exercise_log (student_id, attachment_id, email, file_name) VALUE (?, ?, ?, ?);',
				[req.session.studentId, attachId, req.session.email, hashedName],
				(err: IError, insertResult) => {
					if (err) {
						// FIXME: error handling
						console.error('[rest_api::runExercise::insert] : ', err);
						res.sendStatus(500);
						return;
					}


					console.log('\n[runExercise:insert into exercise_log]');
					console.log(insertResult);
					console.log();


					const logId = insertResult.insertId;

					docker.run(
						'judge_server',
						['bash', './judge.sh'],
						[process.stdout, process.stderr], // TODO: redirect these
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
								console.error('[rest_api::runExercise::docker_run] : ', err);
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
											console.error('[rest_api::runExercise::temp_remove] : ', err);
											res.sendStatus(500);
											return;
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
													console.error('[rest_api::runExercise::insert_judge_correct] : ', err);
													res.sendStatus(500);
													return;
												}
											});

										dbClient.query(
											'INSERT IGNORE INTO exercise_quick_result (attach_id, student_id, result) VALUE (?, ?, ?);',
											[attachId, req.session.studentId, true],
											(err, row) => {
												if (err) {
													// FIXME: error handling
													console.error('[rest_api::runExercise::insert_judge_correct] : ', err);
													res.sendStatus(500);
													return;
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
													console.error('[rest_api::runExercise::insert_judge_incorrect] : ', err);
													res.sendStatus(500);
													return;
												}
											});

										fs.readFile(
											path.join(answerPath, result.unmatchedIndex + '.out'),
											(err: NodeJS.ErrnoException, data: Buffer) => {
												if (err) {
													// FIXME: error handling
													console.error('[rest_api::runExercise::read_file] : ', err);
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
											console.error('[rest_api::runExercise::remove_file] : ', err);
											res.sendStatus(500);
											return;
										}
									});

									fs.exists(compileErrorFile, (exists: boolean) => {
										if (exists) {
											fs.readFile(compileErrorFile, (err: NodeJS.ErrnoException, data: Buffer) => {
												if (err) {
													// FIXME: error handling
													console.error('[rest_api::runExercise::read_file] : ', err);
													res.sendStatus(500);
													return;
												}

												const errorStr = data.toString();

												res.setHeader('Content-Type', 'application/json');
												res.status(400).send(JSON.stringify({
													errorMsg: errorStr
												}));


												dbClient.query(
													'INSERT INTO exercise_result(log_id, result, error_msg) VALUE(?,?,?);',
													[logId, false, errorStr],
													(err, row) => {
														if (err) {
															// FIXME: error handling
															console.error('[rest_api::runExercise::insert_compile_error] : ', err);
															res.sendStatus(500);
															return;
														}
													})
											})
										}
										else {
											// TODO: error handling
										}
									})
								}
							});


							// remove input temporary folder
							fs_ext.remove(sourcePath, (err: Error) => {
								if (err) {
									// FIXME: error handling
									console.error('[rest_api::runExercise::temp_remove] : ', err);
									res.sendStatus(500);
									return;
								}
							});

							container.remove();
						});
				}
			);
		}
	);
}