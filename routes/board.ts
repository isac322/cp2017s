import {Request, Response, Router} from 'express'
import {logger} from '../app'
import BaseRoute from './route'


/**
 * /board route
 *
 * @class BoardRoute
 */
export default class BoardRoute extends BaseRoute {

	/**
	 * Constructor
	 *
	 * @class BoardRoute
	 * @constructor
	 */
	constructor() {
		super();
		this.navPos = 6;
	}

	/**
	 * Create the routes.
	 *
	 * @class ProfileRoute
	 * @method create
	 * @static
	 */
	public static create(router: Router) {
		//log
		logger.debug('[BoardRoute::create] Creating board route.');

		//add home page route
		router.get('/board', (req: Request, res: Response) => new BoardRoute().board(req, res));
	}

	/**
	 * The board page route.
	 *
	 * @class BoardRoute
	 * @method board
	 * @param req {Request} The express Request object.
	 * @param res {Response} The express Response object.
	 */
	public board(req: Request, res: Response) {
		this.title = 'Web board';

		if (!req.session.signIn) {
			return res.redirect('/');
		}


		//render template
		this.render(req, res, 'board');
	}
}