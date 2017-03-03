import { NextFunction, Request, Response, Router } from "express";
import { BaseRoute } from "./route";


/**
 * / route
 *
 * @class User
 */
export class LoginRoute extends BaseRoute {

	/**
	 * Create the routes.
	 *
	 * @class LoginRoute
	 * @method create
	 * @static
	 */
	public static create(router: Router) {
		console.log("[IndexRoute::create] Creating login route.");

		router.get("/login", (req: Request, res: Response, next: NextFunction) => {
			new LoginRoute().index(req, res, next);
		});
	}

	/**
	 * Constructor
	 *
	 * @class LoginRoute
	 * @constructor
	 */
	constructor() {
		super();
	}

	/**
	 * The home page route.
	 *
	 * @class LoginRoute
	 * @method index
	 * @param req {Request} The express Request object.
	 * @param res {Response} The express Response object.
	 * @next {NextFunction} Execute the next method.
	 */
	public index(req: Request, res: Response, next: NextFunction) {
		//set custom title
		this.title = "Home | Tour of Heros";

		//set options
		let options: Object = {
			"message": "Welcome to the Tour of Heros"
		};

		//render template
		this.render(req, res, "login", options);
	}
}