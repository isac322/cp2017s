import {Request, Response} from "express";
import {IConnection, createConnection, escape} from "mysql";
import * as fs from 'fs'
import * as crypto from 'crypto'
import * as path from 'path'


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
				(err, result) => {
					if (err) {
						// FIXME: error handling
						throw err;
					}

					console.log('\n[signIn]');
					console.log(result);
					console.log();

					switch (result.length) {
						case 0:
							res.sendStatus(404);
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
				(err, selectResult) => {
					if (err || selectResult.length != 1) {
						// FIXME: error handling
						throw err;
					}

					console.log('\n[register:outer]');
					console.log(selectResult);
					console.log();

					// TODO: check not listed student exception

					dbClient.query(
						'INSERT INTO email VALUES (?,?,?);',
						[studentId, email, nameInGoogle],
						(err, insertResult) => {
							if (err) {
								// FIXME: error handling
								throw err;
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
		return res.redirect('/homework');
	}
	else {
		const name = encodeURIComponent(req.body.name);
		const start_date = req.body.start;
		const end_date = req.body.due;
		const description = req.body.description;

		dbClient.query(
			'INSERT INTO homework(name, start_date, end_date, author_id, description) VALUES(?,?,?,?,?);',
			[name, start_date, end_date, req.session.studentId, description],
			(err, insertResult) => {
				if (err) {
					// FIXME: error handling
					throw err;
				}

				console.log('\n[createHW:insert into homework]');
				console.log(insertResult);
				console.log();

				const id = insertResult.insertId;

				const values = [];

				for (let attachment of req.body.attachment) {
					const hwName = encodeURIComponent(attachment.name);
					const extension = attachment.extension;

					values.push([id, hwName, extension]);
				}

				dbClient.query(
					'INSERT INTO hw_config(homework_id, name, extension) VALUES ' + escape(values) + ';',
					(err, result) => {
						if (err) {
							// FIXME: error handling
							throw err;
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
		(err, insertResult) => {
			if (err) {
				// FIXME: error handling
				throw err;
			}
			else {
				console.log('\n[uploadAttach:insert into submit_log]');
				console.log(insertResult);
				console.log();

				file.mv(path.join('media', hashedName), (err) => {
					if (err) {
						// FIXME: error handling
						throw err;
					}
				});

				res.sendStatus(202)
			}
		}
	);
}