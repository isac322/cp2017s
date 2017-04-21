import {NextFunction, Request, Response, Router} from "express";
import {BaseRoute} from "./route";
import {dbClient} from "./rest_api";
import {logger} from "../app";
import {IError} from "mysql";
import * as util from "util";
import * as async from "async";


/**
 * /history route
 *
 * @class HistoryRoute
 */
export class HistoryRoute extends BaseRoute {

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

		//add home page route
		router.get('/history', (req: Request, res: Response, next: NextFunction) => {
			new HistoryRoute().history(req, res, next);
		});
	}

	/**
	 * Constructor
	 *
	 * @class HistoryRoute
	 * @constructor
	 */
	constructor() {
		super();
		this.navPos = 4;
	}

	/**
	 * The history page route.
	 *
	 * @class HistoryRoute
	 * @method index
	 * @param req {Request} The express Request object.
	 * @param res {Response} The express Response object.
	 * @param next {NextFunction} Execute the next method.
	 */
	public history(req: Request, res: Response, next: NextFunction) {
		if (!req.session.signIn) return res.redirect('/');

		this.title = 'History';

		const tasks = [];

		tasks.push((callback) => {
			dbClient.query(
				'SELECT email FROM email WHERE student_id = ?;',
				req.session.studentId,
				callback)
		});

		tasks.push((callback) => {
			dbClient.query(
				'SELECT homework.name AS `homeworkName`, hw_config.name AS `fileName`, hw_config.id ' +
				'FROM homework JOIN hw_config ON homework.homework_id = hw_config.homework_id;',
				callback)
		});

		tasks.push((callback) => {
			dbClient.query(
				'SELECT exercise.name  AS `exerciseName`, exercise_config.name AS `fileName`, exercise_config.id ' +
				'FROM exercise JOIN exercise_config ON exercise.id = exercise_config.exercise_id',
				callback)
		});

		if (req.session.admin) {
			tasks.push((callback) => {
				dbClient.query('SELECT name, student_id FROM user ORDER BY name;', callback)
			})
		}

		async.parallel(tasks, (err: IError, data: Array<Array<any>>) => {
			if (err) {
				logger.error('[history::searching_in_parallel]');
				logger.error(util.inspect(err, {showHidden: false, depth: null}));
				res.sendStatus(500);
				return;
			}

			res.locals.emailList = data[0][0];
			res.locals.homeworkList = data[1][0];
			res.locals.exerciseList = data[2][0];
			if (req.session.admin) res.locals.userList = data[3][0];

			this.render(req, res, 'history');
		})
	}
}