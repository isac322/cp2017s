import {NextFunction, Request, Response, Router} from "express";
import * as util from "util";
import {logger} from "../app";
import {dbClient} from "./rest_api";
import {BaseRoute} from "./route";
import {monthNames} from "./homework";

/**
 * /project route
 *
 * @class ProjectRoute
 */
export class ProjectRoute extends BaseRoute {
	private static pjQuery = (studentId) => {
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
		router.get('/project', (req: Request, res: Response, next: NextFunction) => {
			projectRoute.project(req, res, next);
		});

		router.get('/project/add', (req: Request, res: Response, next: NextFunction) => {
			projectRoute.add(req, res, next);
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
	 * @param next {NextFunction} Execute the next method.
	 */
	public project(req: Request, res: Response, next: NextFunction) {
		this.title = 'Project List';

		if (!req.session.signIn) return res.redirect('/');

		dbClient.query(
			req.session.signIn ? ProjectRoute.pjQuery(req.session.studentId) : ProjectRoute.guestPjQuery,
			(err, searchResult) => {
				if (err) {
					logger.error('[ProjectRoute::project]');
					logger.error(util.inspect(err, {showHidden: false, depth: null}));
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
	 * @param next {NextFunction} Execute the next method.
	 */
	public add(req: Request, res: Response, next: NextFunction) {
		this.title = 'Create Project';

		if (!req.session.admin) {
			return res.redirect('/project');
		}
		else {
			//render template
			return this.render(req, res, 'project_add');
		}
	}
}