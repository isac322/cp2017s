import {Request, Response} from "express";
import * as fs from "fs";
import {createConnection, IConnection, IError} from "mysql";
import * as util from "util";
import {logger} from "../../app";

const webConfig = JSON.parse(fs.readFileSync('config/web.json', 'utf-8'));
const CLIENT_ID = webConfig.google.clientId;

const GoogleAuth = require('google-auth-library');
const auth = new GoogleAuth;
const OAuth2Client = new auth.OAuth2(CLIENT_ID, '', '');

const dbConfig = JSON.parse(fs.readFileSync('config/database.json', 'utf-8'));
const dbClient: IConnection = createConnection({
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
		(e: any, login: any) => {
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
						logger.error('[rest_api::signIn::select] : ');
						logger.error(util.inspect(err, {showHidden: false}));
						res.sendStatus(500);
						return;
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
	if (!req.session.signIn) return res.sendStatus(401);

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
	if (req.session.signIn) return res.sendStatus(401);

	const body = req.body;

	const studentId = body.student_id1 + '-' + body.student_id2;
	const name = encodeURIComponent(body.name);
	const idToken = body.id_token;

	OAuth2Client.verifyIdToken(
		idToken,
		CLIENT_ID,
		(e: any, login: any) => {
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
						logger.error('[rest_api::register::select] : ');
						logger.error(util.inspect(err, {showHidden: false}));
						res.sendStatus(500);
						return
					}
					else if (selectResult.length == 0) {
						res.sendStatus(204);
						return
					}

					logger.debug('[register:outer]');
					logger.debug(util.inspect(selectResult, {showHidden: false, depth: 1}));

					dbClient.query(
						'INSERT INTO email VALUES (?,?,?);',
						[studentId, email, nameInGoogle],
						(err: IError, insertResult) => {
							if (err) {
								logger.error('[rest_api::register::insert] : ');
								logger.error(util.inspect(err, {showHidden: false}));
								res.sendStatus(500);
								return
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