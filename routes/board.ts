import {NextFunction, Request, Response, Router} from "express";
import {BaseRoute} from "./route";
import {logger} from "../app";


/**
 * /board route
 *
 * @class BoardRoute
 */
export class BoardRoute extends BaseRoute {

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
		router.get('/board', (req: Request, res: Response, next: NextFunction) => {
			new BoardRoute().board(req, res, next);
		});
	}

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
	 * The board page route.
	 *
	 * @class BoardRoute
	 * @method board
	 * @param req {Request} The express Request object.
	 * @param res {Response} The express Response object.
	 * @param next {NextFunction} Execute the next method.
	 */
	public board(req: Request, res: Response, next: NextFunction) {
		this.title = 'Web board';

		if (!req.session.signIn) {
			return res.redirect('/');
		}


		//render template
		this.render(req, res, 'board');
	}
}