import {Request, Response, Router} from 'express'

import {logger} from '../app'
import BaseRoute from './route'


/**
 * / route
 *
 * @class IndexRoute
 */
export default class IndexRoute extends BaseRoute {

	/**
	 * Constructor
	 *
	 * @class IndexRoute
	 * @constructor
	 * @override
	 */
	constructor() {
		super();
		this.navPos = 1;
	}

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

		const indexRoute = new IndexRoute();

		//add home page route
		router.get('/', (req, res) => indexRoute.index(req, res));
	}

	/**
	 * The home page route.
	 *
	 * @class IndexRoute
	 * @method index
	 * @param req {Request} The express Request object.
	 * @param res {Response} The express Response object.
	 */
	public index(req: Request, res: Response) {
		this.title = 'SNU Computer Programming';

		//render template
		this.render(req, res, 'index');
	}
}