import * as async from "async";
import {Request, Response, Router} from "express";
import * as fs from "fs";
import {createConnection, IConnection, IError, IFieldInfo} from "mysql";
import * as util from "util";
import {logger} from "../app";
import {monthNames} from "./homework";
import {BaseRoute} from "./route";


const dbConfig = JSON.parse(fs.readFileSync('config/database.json', 'utf-8'));
const dbClient: IConnection = createConnection({
	host: dbConfig.host,
	user: dbConfig.user,
	password: dbConfig.password,
	database: dbConfig.database
});

/**
 * /project route
 *
 * @class ProjectRoute
 */
export class ProjectRoute extends BaseRoute {
	private static pjQuery = (studentId: string) => {
		return '' +
			'SELECT project.id, project.name, start_date, end_date, description, ' +
			'		project_config.id AS `file_id`, project_config.name AS `file_name`, extension AS `file_extension`, ' +
			'		(reduced_submit.attachment_id IS NOT NULL) AS submitted ' +
			'FROM project ' +
			'	LEFT JOIN project_config ' +
			'		ON project.id = project_config.project_id ' +
			'	LEFT JOIN ( ' +
			'				SELECT attachment_id ' +
			'				FROM project_log ' +
			'				WHERE student_id = "' + studentId + '" ' +
			'				GROUP BY attachment_id ' +
			'			) AS reduced_submit ' +
			'		ON project_config.id = reduced_submit.attachment_id;';
	};

	private static guestPjQuery =
		'SELECT project.id, project.name, project.start_date, project.end_date, project.description,' +
		'       project_config.name AS `file_name`, project_config.extension AS `file_extension` ' +
		'FROM project ' +
		'        LEFT JOIN project_config ' +
		'            ON project.id = project_config.project_id;';

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
		router.get('/project', (req: Request, res: Response) => {
			projectRoute.project(req, res);
		});

		router.get('/project/add', (req: Request, res: Response) => {
			projectRoute.add(req, res);
		});

		router.get('/project/judge/:projectId([0-9]+)', (req: Request, res: Response) => {
			projectRoute.judge(req, res);
		});
	}

	/**
	 * Constructor
	 *
	 * @class ProjectRoute
	 * @constructor
	 */
	constructor() {
		super();
		this.navPos = 4;
	}

	/**
	 * The project page route.
	 *
	 * @class ProjectRoute
	 * @method project
	 * @param req {Request} The express Request object.
	 * @param res {Response} The express Response object.
	 */
	public project(req: Request, res: Response) {
		this.title = 'Project List';

		if (!req.session.signIn) return res.redirect('/');

		dbClient.query(
			req.session.signIn ? ProjectRoute.pjQuery(req.session.studentId) : ProjectRoute.guestPjQuery,
			(err, searchResult) => {
				if (err) {
					logger.error('[ProjectRoute::project]');
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
					attachments: Array<{ id: number, name: string, submitted: boolean }>
				};
				let project = [];

				for (let record of searchResult) {
					if (record.id != currentId) {
						currentObject = {
							id: record.id,
							name: decodeURIComponent(record.name),
							startDate: monthNames[record.start_date.getMonth()] + ' ' + record.start_date.getDate(),
							dueDate: monthNames[record.end_date.getMonth()] + ' ' + record.end_date.getDate(),
							description: record.description.split('|'),
							leftMillis: record.end_date - Date.now() + 24 * 60 * 60 * 1000,
							attachments: []
						};
						project.push(currentObject);

						currentId = record.id;
					}

					currentObject.attachments.push({
						id: record.file_id,
						name: decodeURIComponent(record.file_name),
						submitted: record.submitted
					});
				}

				logger.debug(util.inspect(project, {showHidden: false, depth: 1}));

				res.locals.projectList = project.reverse();

				//render template
				this.render(req, res, 'project');
			}
		);
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
			return this.render(req, res, 'project_add');
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
	public judge(req: Request, res: Response) {
		this.title = 'Judging Project';

		if (!req.session.admin) return res.redirect('/project');

		async.parallel(
			[
				(callback) => dbClient.query('SELECT name, student_id FROM user WHERE NOT is_dropped ORDER BY name;', callback),
				(callback) => dbClient.query('SELECT id, name FROM project', callback),
				(callback) => dbClient.query(
					'SELECT project_board.* ' +
					'FROM project_config JOIN project_board ON project_config.id = project_board.attachment_id ' +
					'WHERE project_id = ?;',
					req.params.projectId,
					callback),
				(callback) => dbClient.query(
					'SELECT id, name, extension FROM project_config WHERE project_id = ?;',
					req.params.projectId,
					callback)
			],
			(err: IError, result: Array<[Array<any>, Array<IFieldInfo>]>) => {
				if (err) {
					logger.error('[ProjectRoute::judge]');
					logger.error(util.inspect(err, {showHidden: false}));
					res.sendStatus(500);
					return;
				}

				res.locals.userList = result[0][0];
				res.locals.projectList = result[1][0];

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

				res.locals.projectConfig = result[3][0].reduce(
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

				res.locals.currentId = req.params.projectId;

				//render template
				this.render(req, res, 'project_manage');
			});
	}
}