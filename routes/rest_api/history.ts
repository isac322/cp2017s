import {Request, Response} from 'express'
import {escape} from 'mysql'
import {QueryTypes} from 'sequelize'

import {logger} from '../../app'
import {exerciseEntryInstance} from '../../models/db'
import {default as db, sequelize} from '../../models/index'

const ROWS_IN_PAGE = 30;

interface HistoryEntry {
	created: Date,
	studentId: string,
	category: string,
	logId: string,
	problemInfoId: string,
	name: string,
	extension: string,
	result: string,
	email: string,
	userName: string
}

/**
 * Send history data.
 *
 * @method historyList
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export async function historyList(req: Request, res: Response) {
	if (!req.session.signIn) return res.sendStatus(401);

	const query: {
		hw: string[] | string,
		ex: string[] | string,
		pj: string[] | string,
		r: string[] | string,
		e: string[] | string,
		u: string[] | string,
		t: string,
		p: string
	} = req.query;

	let wherePart = '';

	if (req.session.admin && query.u) wherePart += 'history.student_id IN (' + escape(query.u) + ')';
	else wherePart += 'history.student_id = ' + escape(req.session.studentId);

	if (query.e) wherePart += ' AND history.email IN (' + escape(query.e) + ')';

	if (query.ex) wherePart += ' AND exercise_group_id IN (' + escape(query.ex) + ')';
	if (query.r) wherePart += ' AND result.type IN (' + escape(query.r) + ')';

	if (query.hw) wherePart += ' AND homework_entry_id IN (' + escape(query.hw) + ')';

	if (query.pj) wherePart += ' AND project_entry_id IN (' + escape(query.pj) + ')';
	if (query.t != '0') wherePart += ` AND category = ${query.t}`;


	const adminJoin = req.session.admin ? 'JOIN user ON history.student_id = user.student_id' : '';
	const adminField = req.session.admin ? ',user.name AS `userName`' : '';

	try {
		const [exerciseEntryInfoList, histories]: [exerciseEntryInstance[], HistoryEntry[]] = await Promise.all([
			db.exerciseEntry.findAll({
				attributes: ['id', 'name', 'extension'],
				raw: true
			}),
			// language=MySQL
			sequelize.query(`
SELECT SQL_CALC_FOUND_ROWS
	history.created,
	history.student_id                                                                            AS \`studentId\`,
	category,
	IFNULL(homework_id, 0) + IFNULL(history.exercise_id, 0) + IFNULL(project_id, 0)               AS \`logId\`,
	IFNULL(homework_entry_id, 0) + IFNULL(exercise_group_id, 0) + IFNULL(project_entry_id, 0)     AS \`problemInfoId\`,
	CONCAT(IFNULL(homework_entry.name, ''), IFNULL(subtitle, ''), IFNULL(project_entry.name, '')) AS \`name\`,
	IF(category = 'Exercise',
		NULL,
		CONCAT(IFNULL(homework_entry.extension, ''), IFNULL(project_entry.extension, '')))   	  AS \`extension\`,
	result.type                                                                                   AS \`result\`,
	history.email
	${adminField}
FROM history ${adminJoin}
	LEFT JOIN homework_entry ON history.homework_entry_id = homework_entry.id
	LEFT JOIN exercise_group ON history.exercise_group_id = exercise_group.id
	LEFT JOIN project_entry ON history.project_entry_id = project_entry.id
	LEFT JOIN
	(SELECT
		 type,
		 log_id
	 FROM exercise_judge_log
		 JOIN exercise_judge_result ON exercise_judge_log.id = exercise_judge_result.log_id) AS result
		ON log_id = history.exercise_id
WHERE ${wherePart}
ORDER BY created DESC
LIMIT ?, ?`, {
				replacements: [Number(query.p) * ROWS_IN_PAGE, ROWS_IN_PAGE],
				raw: true,
				type: QueryTypes.SELECT
			})
		]);

		// language=MySQL
		const countHistory = await sequelize.query('SELECT FOUND_ROWS() AS total;', {
			raw: true,
			type: QueryTypes.SELECT
		});

		const uploadInfoList: any[] = await db.exerciseJudgeEntryLog.findAll({
			include: [{
				model: db.exerciseUploadLog,
				as: 'uploadLogs',
				attributes: ['entryId']
			}],
			raw: true,
			where: {
				judgeId: histories
					.filter(value => value.category == 'Exercise')
					.map(value => Number(value.logId))
			}
		});

		res.json({
			data: histories,
			exerciseInfoMap: uploadInfoList
				.reduce((prev: { [key: number]: { [key: number]: number } }, curr) => {
					if (!(curr.judgeId in prev)) prev[curr.judgeId] = {};
					prev[curr.judgeId][curr.uploadId] = curr['uploadLogs.entryId'];
					return prev;
				}, {}),
			exerciseEntryMap: exerciseEntryInfoList
				.reduce((prev: { [key: number]: { name: string, extension: string } }, curr) => {
					prev[curr.id] = {name: curr.name, extension: curr.extension};
					return prev;
				}, {}),
			total: (countHistory[0].total + ROWS_IN_PAGE - 1) / ROWS_IN_PAGE >> 0,
			p: Number(query.p)
		})
	}
	catch (err) {
		logger.error('[rest_api::history::historyList::search] : ', err.stack);
		return res.sendStatus(500);
	}
}