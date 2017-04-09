import {NextFunction, Request, Response, Router} from "express";
import {BaseRoute} from "./route";
import {dbClient} from "./rest_api";
import {logger} from "../app";
import {IError} from "mysql";
import * as util from "util";


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
		if (!req.session.signIn) {
			return res.redirect('/');
		}

		this.title = 'History';


		if (req.session.admin) {
			dbClient.query(
				'SELECT name, student_id FROM user ORDER BY name;',
				(err: IError, userList) => {
					if (err) {
						// FIXME: error handling
						logger.error('[history::search_user]');
						logger.error(util.inspect(err, {showHidden: false, depth: null}));
						res.sendStatus(500);
						return;
					}

					res.locals.userList = userList;
				});
		}


		dbClient.query(
			'SELECT email ' +
			'FROM email ' +
			'WHERE student_id = ?;',
			req.session.studentId,
			(err: IError, emailList) => {
				if (err) {
					// FIXME: error handling
					logger.error('[exercise::search_email]');
					logger.error(util.inspect(err, {showHidden: false, depth: null}));
					res.sendStatus(500);
					return;
				}

				res.locals.emailList = emailList;
			});


		dbClient.query(
			'SELECT homework.name AS `homeworkName`, hw_config.name AS `fileName` ' +
			'FROM homework JOIN hw_config ON homework.homework_id = hw_config.homework_id;',
			(err: IError, homeworkList) => {
				if (err) {
					// FIXME: error handling
					logger.error('[history::search_names]');
					logger.error(util.inspect(err, {showHidden: false, depth: null}));
					res.sendStatus(500);
					return;
				}

				res.locals.homeworkList = homeworkList;


				dbClient.query(
					'SELECT exercise.name  AS `exerciseName`, exercise_config.name AS `fileName` ' +
					'FROM exercise JOIN exercise_config ON exercise.id = exercise_config.exercise_id',
					(err: IError, exerciseList) => {
						if (err) {
							// FIXME: error handling
							logger.error('[history::search_names]');
							logger.error(util.inspect(err, {showHidden: false, depth: null}));
							res.sendStatus(500);
							return;
						}

						res.locals.exerciseList = exerciseList;

						//render template
						this.render(req, res, 'history');
					});
			});
	}
}