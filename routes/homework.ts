import {NextFunction, Request, Response, Router} from "express";
import {dbClient} from "./rest_api";
import {BaseRoute} from "./route";

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
	private static hwQuery = (student_id) => {
		const ret =
			'SELECT homework.homework_id, homework.name, homework.start_date, homework.end_date, homework.description,' +
			'       hw_config.id AS `file_id`, hw_config.name AS `file_name`, hw_config.extension AS `file_extension`,' +
			'       reduced_submit.submitted_name, reduced_submit.submitted_time ' +
			'FROM homework ' +
			'     LEFT JOIN hw_config ' +
			'         ON homework.homework_id = hw_config.homework_id ' +
			'     LEFT JOIN ( ' +
			'         SELECT attachment_id, file_name AS `submitted_name`, MAX(submitted) AS `submitted_time` ' +
			'         FROM submit_log ' +
			'         WHERE student_id = \'' + student_id + '\' ' +
			'         GROUP BY attachment_id ' +
			'     ) AS reduced_submit ' +
			'         ON hw_config.id = reduced_submit.attachment_id;';

		return ret;
	};

	private static guestHwQuery =
		'SELECT homework.homework_id, homework.name, homework.start_date, homework.end_date, homework.description,' +
		'       hw_config.name AS `file_name`, hw_config.extension AS `file_extension` ' +
		'FROM homework ' +
		'        LEFT JOIN hw_config ' +
		'            ON homework.homework_id = hw_config.homework_id;';

	/**
	 * Create /homework routes.
	 *
	 * @class IndexRoute
	 * @method create
	 * @static
	 */
	public static create(router: Router) {
		//log
		console.log("[HWRoute::create] Creating homework route.");

		const hwRouter = new HWRoute();

		//add homework page route
		router.get("/homework", (req: Request, res: Response, next: NextFunction) => {
			hwRouter.homework(req, res, next);
		});

		router.get('/homework/add', (req: Request, res: Response, next: NextFunction) => {
			hwRouter.add(req, res, next);
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
	 * @param next {NextFunction} Execute the next method.
	 */
	public homework(req: Request, res: Response, next: NextFunction) {
		this.title = 'Homework List';

		dbClient.query(
			req.session.signIn ? HWRoute.hwQuery(req.session.studentId) : HWRoute.guestHwQuery,
			(err, searchResult) => {
				if (err) {
					// FIXME: error handling
					console.error('[HWRoute::homework] : ', err);
					res.sendStatus(500);
					return;
				}

				console.log('\n[homework]');
				console.log(searchResult);
				console.log();

				let currentId = -1;
				let currentObject: {
					id: number,
					name: string,
					startDate: string,
					dueDate: string,
					deadline: Date,
					description: string,
					leftMillis: number,
					attachments: Array<{ id: number, name: string, extension: string, latestFile?: string, latestTime?: Date }>
				};
				let homework = [];

				for (let record of searchResult) {
					if (record.homework_id != currentId) {
						currentObject = {
							id: record.homework_id,
							name: decodeURIComponent(record.name),
							startDate: monthNames[record.start_date.getMonth()] + ' ' + record.start_date.getDate(),
							dueDate: monthNames[record.end_date.getMonth()] + ' ' + record.end_date.getDate(),
							deadline: record.end_date,
							description: record.description,
							leftMillis: record.end_date - Date.now() + 24 * 60 * 59 * 1000,
							attachments: []
						};
						homework.push(currentObject);

						currentId = record.homework_id;
					}

					currentObject.attachments.push({
						id: record.file_id,
						name: record.file_name,
						extension: record.file_extension,
						latestFile: record.submitted_name,
						latestTime: record.submitted_time
					});
				}

				console.log(homework);

				res.locals.homeworkList = homework;

				//render template
				this.render(req, res, 'homework');
			}
		);
	}

	/**
	 * The homework issuing page route.
	 *
	 * @class add
	 * @method add
	 * @param req {Request} The express Request object.
	 * @param res {Response} The express Response object.
	 * @param next {NextFunction} Execute the next method.
	 */
	public add(req: Request, res: Response, next: NextFunction) {
		this.title = 'Create Homework';

		if (!req.session.admin) {
			return res.redirect('/homework');
		}
		else {
			//render template
			return this.render(req, res, 'homework_add');
		}
	}
}