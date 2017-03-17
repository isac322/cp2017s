import {NextFunction, Request, Response, Router} from "express";
import {BaseRoute} from "./route";


/**
 * /attendance route
 *
 * @class AttendanceRoute
 */
export class AttendanceRoute extends BaseRoute {

	/**
	 * Create the routes.
	 *
	 * @class AttendanceRoute
	 * @method create
	 * @static
	 */
	public static create(router: Router) {
		//log
		console.log("[AttendanceRoute::create] Creating attendance route.");

		//add attendance page route
		router.get("/attendance", (req: Request, res: Response, next: NextFunction) => {
			new AttendanceRoute().attendance(req, res, next);
		});
	}

	/**
	 * Constructor
	 *
	 * @class AttendanceRoute
	 * @constructor
	 */
	constructor() {
		super();
		this.navPos = 3;
	}

	/**
	 * The attendance page route.
	 *
	 * @class AttendanceRoute
	 * @method attendance
	 * @param req {Request} The express Request object.
	 * @param res {Response} The express Response object.
	 * @param next {NextFunction} Execute the next method.
	 */
	public attendance(req: Request, res: Response, next: NextFunction) {
		this.title = 'Attendance';

		if (!req.session.signIn) {
			res.redirect('/');
		}
		else {
			//render template
			this.render(req, res, "attendance");
		}
	}
}