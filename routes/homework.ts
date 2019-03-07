import {Request, Response, Router} from 'express'
import {QueryTypes} from 'sequelize'

import {logger, ProblemType} from '../app'
import {homeworkEntryInstance, homeworkInstance, userInstance} from '../models/db'
import db, {sequelize} from '../models/index'
import BaseRoute from './route'


interface Log {
	logId: number
	studentId: string
	homeworkId: number
	groupId: number
	entryId: number
	submitted: Date
}

/**
 * /homework route
 *
 * @class HWRoute
 */
export default class HWRoute extends BaseRoute {
	/**
	 * Constructor
	 *
	 * @class HWRoute
	 * @constructor
	 * @override
	 */
	protected constructor() {
		super();
		this.navPos = 2;
	}

	/**
	 * Create /homework routes.
	 *
	 * @class HWRoute
	 * @method create
	 * @static
	 */
	public static create(router: Router) {
		//log
		logger.debug('[HWRoute::create] Creating homework route.');

		const hwRouter = new HWRoute();

		//add homework page route
		router.get('/homework', (req, res) => hwRouter.homework(req, res));

		router.get('/homework/add', (req, res) => hwRouter.add(req, res));

		router.get('/homework/judge/:homeworkId([0-9]+)', (req, res) => hwRouter.judge(req, res));
	}

	/**
	 * The homework page route.
	 *
	 * @class HWRoute
	 * @method homework
	 * @param req {Request} The express Request object.
	 * @param res {Response} The express Response object.
	 */
	public async homework(req: Request, res: Response) {
		this.title = 'Homework List';

		try {
			const [homeworkList, logList] = await Promise.all([
				db.homework.findAll({
					attributes: ['id', 'startDate', 'endDate', 'name'],
					include: [{
						model: db.homeworkGroup,
						as: 'groups',
						attributes: ['id', 'subtitle'],

						include: [{
							model: db.homeworkEntry,
							as: 'entries',
							attributes: ['id', 'name']
						}]
					}, {
						model: db.homeworkDescription,
						as: 'descriptions'
					}]
				}),
				db.homeworkLog.findAll({
					where: {studentId: req.session.studentId},
					attributes: ['entryId'],
					group: 'entryId',
					raw: true
				})
			]);

			res.locals.homeworkList = homeworkList.reverse();
			res.locals.submitHistory = logList.reduce((prev, curr) => prev.add(curr.entryId), new Set<number>());

			//render template
			return this.render(req, res, 'homework');
		}
		catch (err) {
			logger.error('[HWRoute::homework]', err.stack);
			return res.sendStatus(500);
		}
	}


	/**
	 * The homework issuing page route.
	 *
	 * @class HWRoute
	 * @method add
	 * @param req {Request} The express Request object.
	 * @param res {Response} The express Response object.
	 */
	public add(req: Request, res: Response) {
		this.title = 'Create Homework';

		if (!req.session.admin) {
			return res.redirect('/homework');
		}
		else {
			//render template
			res.locals.problemType = ProblemType.HOMEWORK;

			return this.render(req, res, 'problem_add');
		}
	}


	/**
	 * Judging page of submitted homework
	 *
	 * @class HWRoute
	 * @method judge
	 * @param req {Request} The express Request object.
	 * @param res {Response} The express Response object.
	 */
	public async judge(req: Request, res: Response) {
		if (!req.session.admin) return res.redirect('/homework');

		this.title = 'Judging Homework';

		const homeworkId = req.params.homeworkId;

		try {
			const [userList, homeworkList, homeworkEntryList, logList]:
				[userInstance[], homeworkInstance[], homeworkEntryInstance[], Log[]] = await Promise.all([
				db.user.findAll({
					attributes: ['studentId', 'name'],
					where: {isAdmin: 1, isDropped: 0},
					order: ['name'],
					raw: true
				}),
				db.homework.findAll({attributes: ['id', 'name'], raw: true}),
				db.homeworkEntry.findAll({raw: true}),
				// language=MySQL
				sequelize.query(`
                    SELECT
                        log_id                  AS \`logId\`,
                        homework_log.student_id AS \`studentId\`,
                        homework_id             AS \`homeworkId\`,
                        group_id                AS \`groupId\`,
                        homework_log.entry_id   AS \`entryId\`,
                        submitted
                    FROM homework_latest_entry
                        JOIN homework_log ON homework_latest_entry.log_id = homework_log.id
                    WHERE homework_id = ?`, {replacements: [homeworkId], type: QueryTypes.SELECT, raw: true})
			]);

			res.locals.userList = userList;
			res.locals.problemList = homeworkList;
			res.locals.entryInfo = homeworkEntryList.reduce(
				(prev: { [key: number]: homeworkEntryInstance }, curr) => {
					prev[curr.id] = curr;
					return prev;
				}, {});
			res.locals.perStudentEntry = logList.reduce((groups: { [sdutendId: string]: Log[] }, item) => {
				const val = item.studentId;
				groups[val] = groups[val] || [];
				groups[val].push(item);
				return groups;
			}, {});
			res.locals.currentId = homeworkId;

			//render template
			return this.render(req, res, 'homework_manage');
		}
		catch (err) {
			logger.error('[HWRoute::judge]', err.stack);
			return res.sendStatus(500);
		}
	}
}