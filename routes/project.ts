import {Request, Response, Router} from 'express'
import {QueryTypes} from 'sequelize'

import {logger, ProblemType} from '../app'
import {projectEntryInstance, projectInstance, userInstance} from '../models/db'
import db, {sequelize} from '../models/index'
import BaseRoute from './route'


interface Log {
	logId: number
	studentId: string
	projectId: number
	groupId: number
	entryId: number
	submitted: Date
}


/**
 * /project route
 *
 * @class ProjectRoute
 */
export default class ProjectRoute extends BaseRoute {
	/**
	 * Constructor
	 *
	 * @class ProjectRoute
	 * @constructor
	 * @override
	 */
	constructor() {
		super();
		this.navPos = 4;
	}

	/**
	 * Create /project routes.
	 *
	 * @class ProjectRoute
	 * @method create
	 * @static
	 */
	public static create(router: Router) {
		//log
		logger.debug('[ProjectRoute::create] Creating project route.');

		const projectRoute = new ProjectRoute();

		//add project page route
		router.get('/project', (req, res) => projectRoute.project(req, res));

		router.get('/project/add', (req, res) => projectRoute.add(req, res));

		router.get('/project/judge/:projectId([0-9]+)', (req, res) => projectRoute.judge(req, res));
	}

	/**
	 * The project page route.
	 *
	 * @class ProjectRoute
	 * @method project
	 * @param req {Request} The express Request object.
	 * @param res {Response} The express Response object.
	 */
	public async project(req: Request, res: Response) {
		this.title = 'Project List';

		if (!req.session.signIn) return res.redirect('/');

		try {
			const [projectList, logList] = await Promise.all([
				db.project.findAll({
					attributes: ['id', 'startDate', 'endDate', 'name'],
					include: [{
						model: db.projectGroup,
						as: 'groups',
						attributes: ['id', 'subtitle'],

						include: [{
							model: db.projectEntry,
							as: 'entries',
							attributes: ['id', 'name']
						}]
					}, {
						model: db.projectDescription,
						as: 'descriptions'
					}]
				}),
				db.projectLog.findAll({
					where: {studentId: req.session.studentId},
					attributes: ['entryId'],
					group: 'entryId',
					raw: true
				})
			]);

			res.locals.projectList = projectList.reverse();
			res.locals.submitHistory = logList.reduce((prev, curr) => prev.add(curr.entryId), new Set<number>());

			//render template
			return this.render(req, res, 'project');
		}
		catch (err) {
			logger.error('[ProjectRoute::project]', err.stack);
			return res.sendStatus(500);
		}
	}

	/**
	 * The project issuing page route.
	 *
	 * @class ProjectRoute
	 * @method add
	 * @param req {Request} The express Request object.
	 * @param res {Response} The express Response object.
	 */
	public add(req: Request, res: Response) {
		this.title = 'Create Project';

		if (!req.session.admin) {
			return res.redirect('/project');
		}
		else {
			//render template
			res.locals.problemType = ProblemType.PROJECT;

			return this.render(req, res, 'problem_add');
		}
	}


	/**
	 * Judging page of submitted project
	 *
	 * @class ProjectRoute
	 * @method judge
	 * @param req {Request} The express Request object.
	 * @param res {Response} The express Response object.
	 */
	public async judge(req: Request, res: Response) {
		this.title = 'Judging Project';

		if (!req.session.admin) return res.redirect('/project');

		const projectId = req.params.projectId;

		try {
			const [userList, projectList, projectEntryList, logList]:
				[userInstance[], projectInstance[], projectEntryInstance[], Log[]] = await Promise.all([
				db.user.findAll({
					attributes: ['studentId', 'name'],
					where: {isAdmin: 1, isDropped: 0},
					order: ['name'],
					raw: true
				}),
				db.project.findAll({attributes: ['id', 'name'], raw: true}),
				db.projectEntry.findAll({raw: true}),
				// language=MySQL
				sequelize.query(`
                    SELECT
                        log_id                 AS \`logId\`,
                        project_log.student_id AS \`studentId\`,
                        project_id             AS \`projectId\`,
                        group_id               AS \`groupId\`,
                        project_log.entry_id   AS \`entryId\`,
                        submitted
                    FROM project_latest_entry JOIN project_log ON project_latest_entry.log_id = project_log.id
                    WHERE project_id = ?`, {replacements: [projectId], type: QueryTypes.SELECT, raw: true})
			]);

			res.locals.userList = userList;
			res.locals.problemList = projectList;
			res.locals.entryInfo = projectEntryList.reduce(
				(prev: { [key: number]: projectEntryInstance }, curr) => {
					prev[curr.id] = curr;
					return prev;
				}, {});
			res.locals.perStudentEntry = logList.reduce((groups: { [sdutendId: string]: Log[] }, item) => {
				const val = item.studentId;
				groups[val] = groups[val] || [];
				groups[val].push(item);
				return groups;
			}, {});
			res.locals.currentId = projectId;

			//render template
			return this.render(req, res, 'project_manage');
		}
		catch (err) {
			logger.error('[ProjectRoute::judge]', err.stack);
			return res.sendStatus(500);
		}
	}
}