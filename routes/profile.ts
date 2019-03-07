import {Request, Response, Router} from 'express'

import {logger} from '../app'
import BaseRoute from './route'


/**
 * /profile route
 *
 * @class ProfileRoute
 */
export default class ProfileRoute extends BaseRoute {

	/**
	 * Constructor
	 *
	 * @class ProfileRoute
	 * @constructor
	 * @override
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

		const profileRoute = new ProfileRoute();

		//add home page route
		router.get('/profile', (req, res) => profileRoute.profile(req, res));
	}

	/**
	 * The profile page route.
	 *
	 * @class ProfileRoute
	 * @method profile
	 * @param req {Request} The express Request object.
	 * @param res {Response} The express Response object.
	 */
	public profile(req: Request, res: Response) {
		this.title = 'Profile';

		if (!req.session.signIn) {
			return res.redirect('/');
		}


		//render template
		this.render(req, res, 'profile');
	}
}