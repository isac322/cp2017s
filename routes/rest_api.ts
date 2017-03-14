import {Request, Response} from "express";


const CLIENT_ID = "875872766577-t50bt5dsv9f6ua10a79r536m1b50b4h1.apps.googleusercontent.com";

const GoogleAuth = require('google-auth-library');
const auth = new GoogleAuth;
const OAuth2Client = new auth.OAuth2(CLIENT_ID, '', '');

const Client = require('mariasql');

const dbClient = new Client({
	host: 'localhost',
	user: 'cp2017s',
	password: 'dcs%%*#',
	db: 'cp2017s'
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
			const name = payload['name'];

			dbClient.query(
				'SELECT * from email, user where email = "' + email + '" and user.student_id = email.student_id;',
				(err, row) => {
					if (err) {
						// FIXME: error handling
						throw err;
					}

					console.log('[signIn]');
					console.log(row.info);

					switch (row.info.numRows) {
						case '0':
							res.status(404).send({'name': name, 'idToken': token});
							break;

						case '1':
							req.session.admin = row[0].is_admin == '1';
							req.session.signIn = true;
							req.session.name = decodeURIComponent(row[0].name);
							req.session.student_id = row[0].student_id;
							req.session.email = email;

							res.status(202).send();
							break;

						default:
							res.status(500).send();
							break;
					}
				});
		});
}

export function signOut(req: Request, res: Response) {
	req.session.signIn = false;
	req.session.admin = false;

	res.status(202).send();
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

			dbClient.query(
				'SELECT * FROM user WHERE student_id=\'' + studentId + '\';',
				(err, row) => {
					if (err || row.info.numRows != 1) {
						// FIXME: error handling
						throw err;
					}

					console.log('[register:outer]');
					console.log(row);

					dbClient.query(
						'INSERT INTO email VALUES ( \'' + studentId + '\', \'' + email + '\', \'' + name + '\');',
						(err, row2) => {
							if (err) {
								// FIXME: error handling
								throw err;
							}

							console.log('[register:inner]');
							console.log(row2);

							req.session.signIn = true;
							req.session.name = decodeURIComponent(row[0].name);
							req.session.student_id = row[0].student_id;
							req.session.email = email;
							req.session.admin = row[0].is_admin == '1';

							res.redirect('/');
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
		res.redirect('/homework');
	}
	else {
		console.log(req.body);
		console.log(req.body.attachment);
		console.log(req.body.attachment.name);
		res.redirect('/homework');
	}
}