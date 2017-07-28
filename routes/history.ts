import * as async from "async";
import {NextFunction, Request, Response, Router} from "express";
import * as fs from "fs";
import {createConnection, IConnection, IError, IFieldInfo} from "mysql";
import * as util from "util";
import {logger} from "../app";
import BaseRoute from "./route";


const dbConfig = JSON.parse(fs.readFileSync('config/database.json', 'utf-8'));
const dbClient: IConnection = createConnection({
	host: dbConfig.host,
	user: dbConfig.user,
	password: dbConfig.password,
	database: dbConfig.database
});


/**
 * /history route
 *
 * @class HistoryRoute
 */
export class HistoryRoute extends BaseRoute {

	/**
	 * Constructor
	 *
	 * @class HistoryRoute
	 * @constructor
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

		//add home page route
		router.get('/history', (req: Request, res: Response, next: NextFunction) =>
			new HistoryRoute().history(req, res, next)
		);
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

		tasks.push((callback: (err: IError, results?: any, fields?: IFieldInfo[]) => void) => dbClient.query(
			'SELECT email FROM email WHERE student_id = ?;',
			req.session.studentId,
			callback)
		);

		tasks.push((callback: (err: IError, results?: any, fields?: IFieldInfo[]) => void) => dbClient.query(
			'SELECT homework.name AS `homeworkName`, homework_config.name AS `fileName`, homework_config.id ' +
			'FROM homework JOIN homework_config ON homework.homework_id = homework_config.homework_id;',
			callback)
		);

		tasks.push((callback: (err: IError, results?: any, fields?: IFieldInfo[]) => void) => dbClient.query(
			'SELECT exercise.name  AS `exerciseName`, exercise_config.name AS `fileName`, exercise_config.id ' +
			'FROM exercise JOIN exercise_config ON exercise.id = exercise_config.exercise_id',
			callback)
		);

		tasks.push((callback: (err: IError, results?: any, fields?: IFieldInfo[]) => void) => dbClient.query(
			'SELECT project.name  AS `projectName`, project_config.name AS `fileName`, project_config.id ' +
			'FROM project JOIN project_config ON project.id = project_config.project_id',
			callback)
		);

		if (req.session.admin) {
			tasks.push((callback: (err: IError, results?: any, fields?: IFieldInfo[]) => void) =>
				dbClient.query('SELECT name, student_id FROM user ORDER BY name;', callback))
		}

		async.parallel(tasks, (err: IError, data: Array<[any, Array<IFieldInfo>]>) => {
			if (err) {
				logger.error('[history::searching_in_parallel]');
				logger.error(util.inspect(err, {showHidden: false}));
				res.sendStatus(500);
				return;
			}

			res.locals.emailList = data[0][0];
			res.locals.homeworkList = data[1][0];
			res.locals.exerciseList = data[2][0];
			res.locals.projectList = data[3][0];
			if (req.session.admin) res.locals.userList = data[4][0];

			this.render(req, res, 'history');
		})
	}
}