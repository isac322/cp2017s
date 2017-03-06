import {NextFunction, Request, Response, Router} from "express";
import {BaseRoute} from "./route";


/**
 * /homework route
 *
 * @class HWRoute
 */
export class HWRoute extends BaseRoute {

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
		this.title = 'homework list';

		if (!req.session.signIn) {
			res.redirect('/');
		}
		else {
			//render template
			this.render(req, res, 'homework');
			next();
		}
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
		this.title = 'making homework';

		if (!req.session.admin) {
			res.redirect('/homework');
		}
		else {
			//render template
			this.render(req, res, 'homework_add');
			next();
		}
	}
}