import {NextFunction, Request, Response, Router} from "express";
import {BaseRoute} from "./route";
import {logger} from "../app";


/**
 * / route
 *
 * @class IndexRoute
 */
export class IndexRoute extends BaseRoute {

	/**
	 * Create the routes.
	 *
	 * @class IndexRoute
	 * @method create
	 * @static
	 */
	public static create(router: Router) {
		//log
		logger.debug('[IndexRoute::create] Creating index route.');

		//add home page route
		router.get('/', (req: Request, res: Response, next: NextFunction) => {
			new IndexRoute().index(req, res, next);
		});
	}

	/**
	 * Constructor
	 *
	 * @class IndexRoute
	 * @constructor
	 */
	constructor() {
		super();
		this.navPos = 1;
	}

	/**
	 * The home page route.
	 *
	 * @class IndexRoute
	 * @method index
	 * @param req {Request} The express Request object.
	 * @param res {Response} The express Response object.
	 * @param next {NextFunction} Execute the next method.
	 */
	public index(req: Request, res: Response, next: NextFunction) {
		this.title = 'SNU Computer Programming';

		//render template
		this.render(req, res, 'index');
	}
}