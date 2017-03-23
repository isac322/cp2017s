import {NextFunction, Request, Response, Router} from "express";
import {BaseRoute} from "./route";
import {dbClient} from "./rest_api";
import {IError} from "mysql";
import {monthNames} from "./homework";


/**
 * /exercise route
 *
 * @class ExerciseRoute
 */
export class ExerciseRoute extends BaseRoute {

	/**
	 * Create the routes.
	 *
	 * @class ExerciseRoute
	 * @method create
	 * @static
	 */
	public static create(router: Router) {
		//log
		console.log("[ExerciseRoute::create] Creating exercise route.");

		//add exercise page route
		router.get("/exercise", (req: Request, res: Response, next: NextFunction) => {
			new ExerciseRoute().exercise(req, res, next);
		});
	}

	/**
	 * Constructor
	 *
	 * @class ExerciseRoute
	 * @constructor
	 */
	constructor() {
		super();
		this.navPos = 3;
	}

	/**
	 * The exercise page route.
	 *
	 * @class ExerciseRoute
	 * @method exercise
	 * @param req {Request} The express Request object.
	 * @param res {Response} The express Response object.
	 * @param next {NextFunction} Execute the next method.
	 */
	public exercise(req: Request, res: Response, next: NextFunction) {
		this.title = 'Exercise';

		if (!req.session.signIn) {
			return res.redirect('/');
		}

		dbClient.query(
			'SELECT exercise.id, exercise.name, exercise.start_date, exercise.end_date, exercise.description, ' +
			'       exercise_config.id AS `attach_id`, exercise_config.name AS `file_name`, result ' +
			'FROM exercise JOIN exercise_config ' +
			'        ON exercise.id = exercise_config.exercise_id ' +
			'    LEFT JOIN ( ' +
			'                  SELECT ' +
			'                      attach_id, ' +
			'                      student_id, ' +
			'                      result ' +
			'                  FROM exercise_quick_result ' +
			'                  WHERE student_id = ? ' +
			'              ) AS reduced_quick_result ' +
			'        ON exercise_config.id = reduced_quick_result.attach_id;',
			req.session.studentId,
			(err: IError, searchResult) => {
				if (err) {
					// FIXME: error handling
					console.error('[exercise::first_select] : ', err);
					res.sendStatus(500);
					return;
				}

				console.log('\n[exercise]');
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
					attachments: Array<{id: number, name: string, result?: boolean}>
				};
				let exerciseList = [];

				for (let record of searchResult) {
					if (record.homework_id != currentId) {
						currentObject = {
							id: record.id,
							name: decodeURIComponent(record.name),
							startDate: monthNames[record.start_date.getMonth()] + ' ' + record.start_date.getDate(),
							dueDate: monthNames[record.end_date.getMonth()] + ' ' + record.end_date.getDate(),
							deadline: record.end_date,
							description: record.description,
							leftMillis: record.end_date - Date.now() + 24 * 60 * 59 * 1000,
							attachments: []
						};
						exerciseList.push(currentObject);

						currentId = record.homework_id;
					}

					currentObject.attachments.push({
						id: record.attach_id,
						name: record.file_name,
						result: record.result
					});
				}

				console.log(exerciseList);

				res.locals.exerciseList = exerciseList;

				//render template
				return this.render(req, res, "exercise");
			}
		);
	}
}