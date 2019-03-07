import {Request, Response, Router} from 'express'

import {logger, ProblemType} from '../app'
import db from '../models/index'
import BaseRoute from './route'


/**
 * /exercise route
 *
 * @class ExerciseRoute
 */
export default class ExerciseRoute extends BaseRoute {

	/**
	 * Constructor
	 *
	 * @class ExerciseRoute
	 * @constructor
	 * @override
	 */
	constructor() {
		super();
		this.navPos = 3;
	}

	/**
	 * Create the routes.
	 *
	 * @class ExerciseRoute
	 * @method create
	 * @static
	 */
	public static create(router: Router) {
		//log
		logger.debug('[ExerciseRoute::create] Creating exercise route.');

		const exerciseRoute = new ExerciseRoute();

		//add exercise page route
		router.get('/exercise', (req, res) => exerciseRoute.exercise(req, res));

		router.get('/exercise/add', (req, res) => exerciseRoute.add(req, res));
	}


	/**
	 * The exercise issuing page route.
	 *
	 * @class ExerciseRoute
	 * @method add
	 * @param req {Request} The express Request object.
	 * @param res {Response} The express Response object.
	 */
	public add(req: Request, res: Response) {
		this.title = 'Create Exercise';

		if (!req.session.admin) {
			return res.redirect('/exercise');
		}
		else {
			//render template
			res.locals.problemType = ProblemType.EXERCISE;

			return this.render(req, res, 'problem_add');
		}
	}

	/**
	 * The exercise page route.
	 *
	 * @class ExerciseRoute
	 * @method exercise
	 * @param req {Request} The express Request object.
	 * @param res {Response} The express Response object.
	 */
	public async exercise(req: Request, res: Response) {
		this.title = 'Exercise';

		if (!req.session.signIn) return res.redirect('/');

		try {
			const [exerciseList, submitHistoryList] = await Promise.all([
				db.exercise.findAll({
					attributes: ['id', 'startDate', 'endDate', 'name'],
					include: [{
						model: db.exerciseGroup,
						as: 'groups',
						attributes: ['id', 'subtitle'],

						include: [{
							model: db.exerciseEntry,
							as: 'entries',
							attributes: ['id', 'name']
						}]
					}, {
						model: db.exerciseDescription,
						as: 'descriptions'
					}]
				}),
				db.exerciseUploadLog.findAll({
					where: {studentId: req.session.studentId},
					attributes: ['entryId'],
					group: 'entryId',
					raw: true
				})
			]);

			res.locals.exerciseList = exerciseList.reverse();
			res.locals.submitHistory = submitHistoryList.reduce(
				(prev, curr) => prev.add(curr.entryId),
				new Set<number>());

			//render template
			this.render(req, res, 'exercise');
		}
		catch (err) {
			logger.error('[ExerciseRoute::exercise]', err.stack);
			return res.sendStatus(500);
		}
	}
}