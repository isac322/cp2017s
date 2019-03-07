import {Request, Response} from 'express'
import * as fs from 'fs'
import {OAuth2Client} from 'google-auth-library'

import {logger} from '../../app'
import db from '../../models/index'

const webConfig = JSON.parse(fs.readFileSync('config/web.json', 'utf-8'));
const CLIENT_ID = webConfig.google.clientId;

const googleClient = new OAuth2Client(CLIENT_ID);


/**
 * The sign in request api.
 *
 * @method signIn
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export async function signIn(req: Request, res: Response) {
	if (req.session.signIn) return res.sendStatus(401);

	const token = req.body.idtoken;

	try {
		const verifyResult = await googleClient.verifyIdToken({
			idToken: token,
			audience: CLIENT_ID
		});

		const email: any = await db.email.findOne({
			include: [{
				model: db.user,
				attributes: ['name', 'isAdmin']
			}],
			where: {email: verifyResult.getPayload().email},
			attributes: ['email', 'studentId'],
			raw: true
		});

		if (email != null) {
			req.session.admin = email['user.isAdmin'];
			req.session.email = email.email;
			req.session.name = email['user.name'];
			req.session.signIn = true;
			req.session.studentId = email.studentId;

			res.sendStatus(202);
		}
		else {
			res.sendStatus(204);
		}
	}
	catch (err) {
		logger.error('[rest_api::signIn::select] : ', err.stack);
		return res.sendStatus(500);
	}
}

export function signOut(req: Request, res: Response) {
	if (!req.session.signIn) return res.sendStatus(401);

	// FIXME: error handling
	req.session.destroy(() => res.sendStatus(202));
}


/**
 * The register request api.
 *
 * @method register
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export async function register(req: Request, res: Response) {
	if (req.session.signIn) return res.sendStatus(401);

	const studentId = `${req.body.student_id1}-${req.body.student_id2}`;
	const idToken = req.body.id_token;

	try {
		const userInfo = await db.user.findByPk(studentId, {
			attributes: ['studentId', 'name', 'isAdmin'],
			raw: true
		});

		if (userInfo == null) {
			return res.sendStatus(204);
		}

		const verifyResult = await googleClient.verifyIdToken({
			idToken: idToken,
			audience: CLIENT_ID
		});

		const payload = verifyResult.getPayload();
		const emailInfo = await db.email.create({
			email: payload.email,
			studentId: studentId,
			name: encodeURIComponent(payload.name)
		});

		req.session.admin = userInfo.isAdmin;
		req.session.email = emailInfo.email;
		req.session.name = userInfo.name;
		req.session.signIn = true;
		req.session.studentId = userInfo.studentId;

		return res.sendStatus(201);
	}
	catch (err) {
		logger.error('[rest_api::register] : ', err.stack);
		return res.sendStatus(500);
	}
}