import {Request, Response, Router} from 'express'
import {QueryTypes} from 'sequelize'

import {logger} from '../app'
import db, {sequelize} from '../models/index'
import BaseRoute from './route'


/**
 * /history route
 *
 * @class HistoryRoute
 */
export default class HistoryRoute extends BaseRoute {

	/**
	 * Constructor
	 *
	 * @class HistoryRoute
	 * @constructor
	 * @override
	 */
	constructor() {
		super();
		this.navPos = 5;
	}

	/**
	 * Create the routes.
	 *
	 * @class HistoryRoute
	 * @method create
	 * @static
	 */
	public static create(router: Router) {
		//log
		logger.debug('[HistoryRoute::create] Creating history route.');

		const historyRoute = new HistoryRoute();

		//add home page route
		router.get('/history', (req, res) => historyRoute.history(req, res));
	}

	/**
	 * The history page route.
	 *
	 * @class HistoryRoute
	 * @method index
	 * @param req {Request} The express Request object.
	 * @param res {Response} The express Response object.
	 */
	public async history(req: Request, res: Response) {
		if (!req.session.signIn) return res.redirect('/');

		this.title = 'History';

		try {
			const tasks = [
				db.email.findAll({
					where: {studentId: req.session.studentId},
					raw: true
				}),
				// language=MySQL
				sequelize.query(`
                        SELECT
                            homework.name       AS 'homeworkName',
                            homework_entry.id,
                            homework_entry.name AS 'fileName'
                        FROM homework
                            JOIN homework_group ON homework.id = homework_group.homework_id
                            JOIN homework_entry ON homework_group.id = homework_entry.group_id`,
					{type: QueryTypes.SELECT, raw: true}),
				// language=MySQL
				sequelize.query(`
                        SELECT
                            exercise.name       AS 'exerciseName',
                            exercise_entry.id,
                            exercise_entry.name AS 'fileName'
                        FROM exercise
                            JOIN exercise_group ON exercise.id = exercise_group.exercise_id
                            JOIN exercise_entry ON exercise_group.id = exercise_entry.group_id`,
					{type: QueryTypes.SELECT, raw: true}),
				// language=MySQL
				sequelize.query(`
                        SELECT
                            project.name       AS 'projectName',
                            project_entry.id,
                            project_entry.name AS 'fileName'
                        FROM project
                            JOIN project_group ON project.id = project_group.project_id
                            JOIN project_entry ON project_group.id = project_entry.group_id`,
					{type: QueryTypes.SELECT, raw: true})
			];

			if (req.session.admin) {
				tasks.push(db.user.findAll({attributes: ['name', 'studentId'], order: ['name'], raw: true}));
			}

			const data = await Promise.all(tasks);

			res.locals.emailList = data[0];
			res.locals.homeworkList = data[1];
			res.locals.exerciseList = data[2];
			res.locals.projectList = data[3];
			if (req.session.admin) res.locals.userList = data[4];

			this.render(req, res, 'history');
		}
		catch (err) {
			logger.error('[history::searching_in_parallel]', err.stack);
			return res.sendStatus(500);
		}
	}
}