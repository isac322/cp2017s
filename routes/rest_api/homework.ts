import {Request, Response} from "express";
import * as crypto from "crypto";
import * as fs from "fs";
import * as util from "util";
import {logger, submittedHomeworkPath} from "../../app";
import {createConnection, escape, IConnection, IError} from "mysql";
import * as path from "path";
import {sendZip, ZipEntry} from "./zip";


const dbConfig = JSON.parse(fs.readFileSync('config/database.json', 'utf-8'));
const dbClient: IConnection = createConnection({
	host: dbConfig.host,
	user: dbConfig.user,
	password: dbConfig.password,
	database: dbConfig.database
});


/**
 * creating a new homework request api.
 *
 * @method createHomework
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export function createHomework(req: Request, res: Response) {
	if (!req.session.admin) return res.sendStatus(401);

	const name = encodeURIComponent(req.body.name);
	const start_date = req.body.start;
	const end_date = req.body.due;
	const description = req.body.description;

	dbClient.query(
		'INSERT INTO homework(name, start_date, end_date, author_id, author_email, description) VALUES(?,?,?,?,?,?);',
		[name, start_date, end_date, req.session.studentId, req.session.email, description],
		(err: IError, insertResult) => {
			if (err) {
				logger.error('[rest_api::createHomework::outer_insert] : ');
				logger.error(util.inspect(err, {showHidden: false}));
				res.sendStatus(500);
				return;
			}

			logger.debug('[rest_api::createHomework:insert into homework]');
			logger.debug(util.inspect(insertResult, {showHidden: false, depth: 1}));

			const homeworkId = insertResult.insertId;

			const values = [];

			for (let attachment of req.body.attachment) {
				const fileName = encodeURIComponent(attachment.name);
				const extension = attachment.extension;

				values.push([homeworkId, fileName, extension]);
			}

			dbClient.query(
				'INSERT INTO homework_config(homework_id, name, extension) VALUES ' + escape(values) + ';',
				(err: IError, result) => {
					if (err) {
						logger.error('[rest_api::createHomework::inner_insert] : ');
						logger.error(util.inspect(err, {showHidden: false}));
						res.sendStatus(500);
						return;
					}

					logger.debug('[rest_api::createHomework:insert into homework_config]');
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
 * @method uploadHomework
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export function uploadHomework(req: Request, res: Response) {
	if (!req.session.signIn) return res.sendStatus(401);

	const hash = crypto.createHash('sha512');
	const file = (<any>req).files.attachment;
	const hashedName = hash.update(file.data).digest('hex');
	const attachmentId = req.params.attachId;

	dbClient.query(
		'INSERT INTO homework_log(student_id, attachment_id, email, file_name) VALUES (?,?,?,?);',
		[req.session.studentId, attachmentId, req.session.email, hashedName],
		(err: IError, insertResult) => {
			if (err) {
				logger.error('[rest_api::uploadHomework::insert] : ');
				logger.error(util.inspect(err, {showHidden: false}));
				res.sendStatus(500);
				return;
			}

			logger.debug('[uploadHomework:insert into homework_log]');
			logger.debug(util.inspect(insertResult, {showHidden: false, depth: 1}));

			file.mv(path.join(submittedHomeworkPath, hashedName), (err: any) => {
				if (err) {
					logger.error('[rest_api::uploadHomework::file_move] : ');
					logger.error(util.inspect(err, {showHidden: false}));
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
 * @method checkHomeworkName
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export function checkHomeworkName(req: Request, res: Response) {
	if (!req.session.admin) return res.sendStatus(401);

	dbClient.query(
		'SELECT * FROM homework WHERE name = ?;', encodeURIComponent(req.query.name),
		(err: IError, searchResult) => {
			if (err) {
				logger.error('[rest_api::checkHomeworkName::select] : ');
				logger.error(util.inspect(err, {showHidden: false}));
				res.sendStatus(500);
				return;
			}

			res.sendStatus(searchResult.length == 0 ? 200 : 409);
		}
	);
}


/**
 * Send homework file.
 *
 * @method downloadSubmittedHomework
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export function downloadSubmittedHomework(req: Request, res: Response) {
	if (!req.session.signIn) return res.sendStatus(401);

	dbClient.query(
		'SELECT student_id AS `studentId`, file_name AS `fileName`, name ' +
		'FROM homework_log JOIN homework_config ON homework_log.attachment_id = homework_config.id ' +
		'WHERE homework_log.id = ?',
		req.params.logId,
		(err: IError, result: Array<any>) => {
			if (err) {
				logger.error('[rest_api::downloadSubmittedHomework::search] : ');
				logger.error(util.inspect(err, {showHidden: false}));
				res.sendStatus(500);
				return;
			}

			const row = result[0];

			if (req.session.admin || row.studentId == req.session.studentId) {
				res.download(path.join(submittedHomeworkPath, row.fileName), row.name);
			}
			else {
				logger.error('[rest_api::downloadSubmittedHomework::student_id-mismatch]');
				res.sendStatus(401);
			}
		});
}

export function downloadAll(req: Request, res: Response) {
	if (!req.session.admin) return res.sendStatus(401);

	dbClient.query(
		'SELECT student_id, file_name, name ' +
		'FROM homework_config JOIN homework_board ON homework_config.id = homework_board.attachment_id ' +
		`WHERE homework_id = ${req.params.homeworkId}` +
		('studentId' in req.query ?
			` student_id = ${req.query.studentId};` :
			''),
		(err: IError, result: Array<any>) => {
			if (err) {
				logger.error('[rest_api::downloadAll::search] : ');
				logger.error(util.inspect(err, {showHidden: false}));
				res.sendStatus(500);
				return;
			}

			type Entry = {
				student_id: string,
				file_name: string,
				name: string
			};

			const entries = result.reduce((prev: ZipEntry, cur: Entry) => {
				if (!(cur.student_id in prev)) prev[cur.student_id] = {};
				prev[cur.student_id][cur.name] = fs.createReadStream(path.join(submittedHomeworkPath, cur.file_name));
				return prev;
			}, {});

			sendZip(res, entries);
		}
	);
}