import {Request, Response} from "express";
import * as fs from "fs";
import {createConnection, escape, IConnection} from "mysql";
import {logger} from "../../app";
import * as util from "util";
import * as async from "async";

const dbConfig = JSON.parse(fs.readFileSync('config/database.json', 'utf-8'));
const dbClient: IConnection = createConnection({
	host: dbConfig.host,
	user: dbConfig.user,
	password: dbConfig.password,
	database: dbConfig.database
});


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

	if (query.ex === null && query.hw === null) query.t = 3;
	else if (query.ex !== null) query.t = 2;
	else if (query.hw !== null) query.t = 1;

	let commonQuery = '';

	if (req.session.admin) {
		if (query.u) commonQuery += 'user.student_id IN (' + escape(query.u) + ')';
		else commonQuery += 'user.student_id = ' + escape(req.session.studentId);
	}
	else commonQuery += 'student_id = ' + escape(req.session.studentId);
	if (query.e) commonQuery += ' AND email IN (' + escape(query.e) + ')';

	let tasks = [];

	if (query.t & 2) {
		let exerciseQuery = commonQuery;
		if (query.ex) exerciseQuery += ' AND attachment_id IN (' + escape(query.ex) + ')';
		if (query.r) exerciseQuery += ' AND type IN (' + escape(query.r) + ')';

		if (req.session.admin) {
			tasks.push((callback) => {
				dbClient.query(
					'SELECT exercise_log.id, user.student_id AS `studentId`, email, submitted AS `timestamp`, exercise_config.name AS `fileName`, extension, type AS `result`, "Exercise" AS `category`, user.name ' +
					'FROM exercise_log ' +
					'    JOIN exercise_config ON exercise_log.attachment_id = exercise_config.id ' +
					'    LEFT JOIN exercise_result ON exercise_log.id = exercise_result.log_id ' +
					'    JOIN user ON user.student_id = exercise_log.student_id ' +
					'WHERE ' + exerciseQuery + ' ' +
					'ORDER BY submitted DESC',
					callback);
			});
		}
		else {
			tasks.push((callback) => {
				dbClient.query(
					'SELECT exercise_log.id, student_id AS `studentId`, email, submitted AS `timestamp`, name AS `fileName`, extension, type AS `result`, "Exercise" AS `category` ' +
					'FROM exercise_log ' +
					'    JOIN exercise_config ON exercise_log.attachment_id = exercise_config.id ' +
					'    LEFT JOIN exercise_result ON exercise_log.id = exercise_result.log_id ' +
					'WHERE ' + exerciseQuery + ' ' +
					'ORDER BY submitted DESC',
					callback);
			});
		}
	}


	if (query.t & 1) {
		let homeworkQuery = commonQuery;
		if (query.hw) homeworkQuery += ' AND attachment_id IN (' + escape(query.hw) + ')';

		if (req.session.admin) {
			tasks.push((callback) => {
				dbClient.query(
					'SELECT homework_log.id, user.student_id AS `studentId`, email, submitted AS `timestamp`, homework_config.name AS `fileName`, extension, "Homework" AS `category`, user.name ' +
					'FROM homework_log ' +
					'    JOIN homework_config ON homework_log.attachment_id = homework_config.id ' +
					'    JOIN user ON homework_log.student_id = user.student_id ' +
					'WHERE ' + homeworkQuery + ' ' +
					'ORDER BY submitted',
					callback);
			});
		}
		else {
			tasks.push((callback) => {
				dbClient.query(
					'SELECT homework_log.id, student_id AS `studentId`, email, submitted AS `timestamp`, name AS `fileName`, extension, "Homework" AS `category` ' +
					'FROM homework_log ' +
					'    JOIN homework_config ON homework_log.attachment_id = homework_config.id ' +
					'WHERE ' + homeworkQuery + ' ' +
					'ORDER BY submitted',
					callback);
			});
		}
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