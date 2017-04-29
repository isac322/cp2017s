import {Request, Response} from "express";
import * as fs from "fs";
import * as crypto from "crypto";
import {createConnection, escape, IConnection, IError} from "mysql";
import * as util from "util";
import {logger, submittedProjectPath} from "../../app";
import * as path from "path";


const dbConfig = JSON.parse(fs.readFileSync('config/database.json', 'utf-8'));
const dbClient: IConnection = createConnection({
	host: dbConfig.host,
	user: dbConfig.user,
	password: dbConfig.password,
	database: dbConfig.database
});


/**
 * creating a new project request api.
 *
 * @method createProject
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export function createProject(req: Request, res: Response) {
	if (!req.session.admin) return res.sendStatus(401);

	const name = encodeURIComponent(req.body.name);
	const start_date = req.body.start;
	const end_date = req.body.due;
	const description = req.body.description;

	dbClient.query(
		'INSERT INTO project(name, start_date, end_date, author_id, author_email, description) VALUES(?,?,?,?,?,?);',
		[name, start_date, end_date, req.session.studentId, req.session.email, description],
		(err: IError, insertResult) => {
			if (err) {
				logger.error('[rest_api::createProject::outer_insert] : ');
				logger.error(util.inspect(err, {showHidden: false, depth: null}));
				res.sendStatus(500);
				return;
			}

			logger.debug('[createProject:insert into project]');
			logger.debug(util.inspect(insertResult, {showHidden: false, depth: 1}));

			const projectId = insertResult.insertId;

			const values = [];

			for (let attachment of req.body.attachment) {
				const fileName = encodeURIComponent(attachment.name);
				const extension = attachment.extension;

				values.push([projectId, fileName, extension]);
			}

			dbClient.query(
				'INSERT INTO project_config(project_id, name, extension) VALUES ' + escape(values) + ';',
				(err: IError, result) => {
					if (err) {
						logger.error('[rest_api::createProject::inner_insert] : ');
						logger.error(util.inspect(err, {showHidden: false, depth: null}));
						res.sendStatus(500);
						return;
					}

					logger.debug('[createProject:insert into project_config]');
					logger.debug(util.inspect(result, {showHidden: false, depth: 1}));
				}
			);

			res.redirect('/project');
		}
	);
}


/**
 * The attachment upload request api.
 *
 * @method uploadProject
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export function uploadProject(req: Request, res: Response) {
	if (!req.session.signIn) return res.sendStatus(401);

	const hash = crypto.createHash('sha512');
	const file = (<any>req).files.attachment;
	const hashedName = hash.update(file.data).digest('hex');
	const attachmentId = req.params.attachId;

	dbClient.query(
		'INSERT INTO project_log(student_id, attachment_id, email, file_name) VALUES (?,?,?,?);',
		[req.session.studentId, attachmentId, req.session.email, hashedName],
		(err: IError, insertResult) => {
			if (err) {
				logger.error('[rest_api::uploadProject::insert] : ');
				logger.error(util.inspect(err, {showHidden: false, depth: null}));
				res.sendStatus(500);
				return;
			}

			logger.debug('[uploadProject:insert into project_log]');
			logger.debug(util.inspect(insertResult, {showHidden: false, depth: 1}));

			file.mv(path.join(submittedProjectPath, hashedName), (err) => {
				if (err) {
					logger.error('[rest_api::uploadProject::file_move] : ');
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
 * @method pjNameChecker
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export function pjNameChecker(req: Request, res: Response) {
	if (!req.session.admin) return res.sendStatus(401);

	dbClient.query(
		'SELECT * FROM project WHERE name = ?;', encodeURIComponent(req.query.name),
		(err: IError, searchResult) => {
			if (err) {
				logger.error('[rest_api::pjNameChecker::select] : ');
				logger.error(util.inspect(err, {showHidden: false, depth: null}));
				res.sendStatus(500);
				return;
			}

			res.sendStatus(searchResult.length == 0 ? 200 : 409);
		}
	);
}