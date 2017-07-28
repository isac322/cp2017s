import {NextFunction, Request, Response, Router} from "express";
import {logger} from "../app";
import BaseRoute from "./route";


/**
 * /profile route
 *
 * @class ProfileRoute
 */
export class ProfileRoute extends BaseRoute {

	/**
	 * Constructor
	 *
	 * @class ProfileRoute
	 * @constructor
	 */
	constructor() {
		super();
		this.navPos = 99;
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
		logger.debug('[ProfileRoute::create] Creating profile route.');

		//add home page route
		router.get('/profile', (req: Request, res: Response, next: NextFunction) => {
			new ProfileRoute().profile(req, res, next);
		});
	}

	/**
	 * The profile page route.
	 *
	 * @class ProfileRoute
	 * @method profile
	 * @param req {Request} The express Request object.
	 * @param res {Response} The express Response object.
	 * @param next {NextFunction} Execute the next method.
	 */
	public profile(req: Request, res: Response, next: NextFunction) {
		this.title = 'Profile';

		if (!req.session.signIn) {
			return res.redirect('/');
		}


		//render template
		this.render(req, res, 'profile');
	}
}