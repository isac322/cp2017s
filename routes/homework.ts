import {Request, Response, Router} from "express";
import * as util from "util";
import {logger} from "../app";
import {BaseRoute} from "./route";
import * as fs from "fs";
import {createConnection, IConnection, IError, IFieldInfo} from "mysql";
import * as async from "async";


const dbConfig = JSON.parse(fs.readFileSync('config/database.json', 'utf-8'));
const dbClient: IConnection = createConnection({
	host: dbConfig.host,
	user: dbConfig.user,
	password: dbConfig.password,
	database: dbConfig.database
});

export const monthNames = [
	"January", "February", "March",
	"April", "May", "June", "July",
	"August", "September", "October",
	"November", "December"
];

/**
 * /homework route
 *
 * @class HWRoute
 */
export class HWRoute extends BaseRoute {
	private static hwQuery = (studentId: string) => {
		return '' +
			'SELECT homework.homework_id, homework.name, start_date, end_date, description, ' +
			'		homework_config.id AS `file_id`, homework_config.name AS `file_name`, extension AS `file_extension`, ' +
			'		(reduced_submit.attachment_id IS NOT NULL) AS submitted ' +
			'FROM homework ' +
			'	LEFT JOIN homework_config ' +
			'		ON homework.homework_id = homework_config.homework_id ' +
			'	LEFT JOIN ( ' +
			'				SELECT attachment_id ' +
			'				FROM homework_log ' +
			'				WHERE student_id = "' + studentId + '" ' +
			'				GROUP BY attachment_id ' +
			'			) AS reduced_submit ' +
			'		ON homework_config.id = reduced_submit.attachment_id;';
	};

	private static guestHwQuery =
		'SELECT homework.homework_id, homework.name, homework.start_date, homework.end_date, homework.description,' +
		'		homework_config.name AS `file_name`, homework_config.extension AS `file_extension` ' +
		'FROM homework ' +
		'	LEFT JOIN homework_config ' +
		'		ON homework.homework_id = homework_config.homework_id;';

	private static rowInPage = 30;

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
		router.get('/homework', (req: Request, res: Response) => {
			hwRouter.homework(req, res);
		});

		router.get('/homework/add', (req: Request, res: Response) => {
			hwRouter.add(req, res);
		});

		router.get('/homework/judge/:homeworkId([0-9]+)', (req: Request, res: Response) => {
			hwRouter.judge(req, res);
		});
	}

	/**
	 * Constructor
	 *
	 * @class HWRoute
	 * @constructor
	 */
	constructor() {
		super();
		this.navPos = 2;
	}

	/**
	 * The homework page route.
	 *
	 * @class HWRoute
	 * @method homework
	 * @param req {Request} The express Request object.
	 * @param res {Response} The express Response object.
	 */
	public homework(req: Request, res: Response) {
		this.title = 'Homework List';

		dbClient.query(
			req.session.signIn ? HWRoute.hwQuery(req.session.studentId) : HWRoute.guestHwQuery,
			(err, searchResult) => {
				if (err) {
					logger.error('[HWRoute::homework]');
					logger.error(util.inspect(err, {showHidden: false}));
					res.sendStatus(500);
					return;
				}

				let currentId = -1;
				let currentObject: {
					id: number,
					name: string,
					startDate: string,
					dueDate: string,
					description: Array<string>,
					leftMillis: number,
					attachments: Array<{ id: number, name: string, submitted?: boolean }>
				};
				let homework = [];

				for (let record of searchResult) {
					if (record.homework_id != currentId) {
						currentObject = {
							id: record.homework_id,
							name: decodeURIComponent(record.name),
							startDate: monthNames[record.start_date.getMonth()] + ' ' + record.start_date.getDate(),
							dueDate: monthNames[record.end_date.getMonth()] + ' ' + record.end_date.getDate(),
							description: record.description.split('|'),
							leftMillis: record.end_date - Date.now() + 24 * 60 * 60 * 1000,
							attachments: []
						};
						homework.push(currentObject);

						currentId = record.homework_id;
					}

					currentObject.attachments.push({
						id: record.file_id,
						name: decodeURIComponent(record.file_name),
						submitted: record.submitted
					});
				}

				logger.debug(util.inspect(homework, {showHidden: false, depth: 1}));

				res.locals.homeworkList = homework.reverse();

				//render template
				this.render(req, res, 'homework');
			}
		);
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
			return this.render(req, res, 'homework_add');
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
	public judge(req: Request, res: Response) {
		this.title = 'Judging Homework';

		if (!req.session.admin) return res.redirect('/homework');

		async.parallel(
			[
				(callback) => dbClient.query('SELECT name, student_id FROM user WHERE NOT is_dropped ORDER BY name;', callback),
				(callback) => dbClient.query('SELECT homework_id, name FROM homework', callback),
				(callback) => dbClient.query(
					'SELECT homework_board.* ' +
					'FROM homework_config JOIN homework_board ON homework_config.id = homework_board.attachment_id ' +
					'WHERE homework_id = ?;',
					req.params.homeworkId,
					callback),
				(callback) => dbClient.query(
					'SELECT id, name, extension FROM homework_config WHERE homework_id = ?;',
					req.params.homeworkId,
					callback)
			],
			(err: IError, result: Array<[Array<any>, Array<IFieldInfo>]>) => {
				if (err) {
					logger.error('[HWRoute::judge]');
					logger.error(util.inspect(err, {showHidden: false}));
					res.sendStatus(500);
					return;
				}

				res.locals.userList = result[0][0];
				res.locals.homeworkList = result[1][0];

				res.locals.boardMap = result[2][0].reduce(
					(prev: { [studentId: string]: Array<{ logId: number, attachId: number, submitted: string }> },
					 curr: { student_id: string, log_id: number, attachment_id: number, submitted: Date }) => {
						let elem = prev[curr.student_id];

						const item = {
							logId: curr.log_id,
							attachId: curr.attachment_id,
							submitted: curr.submitted.toLocaleString()
						};

						if (elem) {
							elem.push(item);
						}
						else {
							prev[curr.student_id] = [item];
						}

						return prev;
					}, {});

				res.locals.homeworkConfig = result[3][0].reduce(
					(prev: { [id: number]: { name: string, extension: string } },
					 curr: { id: number, name: string, extension: string }) => {
						prev[curr.id] = {
							name: decodeURIComponent(curr.name),
							extension: curr.extension
						};
						return prev;
					}, {});

				res.locals.userMap = result[0][0].reduce(
					(prev: { [studentId: string]: string }, curr: { student_id: string, name: string }) => {
						prev[curr.student_id] = decodeURIComponent(curr.name);
						return prev;
					}, {});

				res.locals.currentId = req.params.homeworkId;

				//render template
				this.render(req, res, 'homework_manage');
			});
	}
}