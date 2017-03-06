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

					console.log(row.info);

					switch (row.info.numRows) {
						case '0':
							res.status(404).send({'name': name, 'idToken': token});
							break;

						case '1':
							req.session.admin = row[0].is_admin == '1';
							req.session.signIn = true;
							req.session.name = decodeURIComponent(row[0].name);

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
				'INSERT INTO user VALUES (\'' + studentId + '\', \'' + name + '\', 0, NOW()) ON DUPLICATE KEY UPDATE name=\'' + name + '\';',
				(err, row) => {
					if (err) {
						// FIXME: error handling
						throw err;
					}

					dbClient.query(
						'INSERT INTO email VALUES ( \'' + studentId + '\', \'' + email + '\');',
						(err, row) => {
							if (err) {
								// FIXME: error handling
								throw err;
							}

							console.log(row);

							res.redirect('/');
						}
					);
				}
			)
		});
}