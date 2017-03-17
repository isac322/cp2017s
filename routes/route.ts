import {Request, Response} from "express";
import * as fs from 'fs';

const webConfig = JSON.parse(fs.readFileSync('config/web.json', 'utf-8'));

const renderOption = {
	clientId: webConfig.google.clientId,
	assistants: webConfig.assistants,
	webManager: webConfig.web_manager,
	classPage: webConfig.class_page,
	shortName: webConfig.short_name,
	yearNSeason: webConfig.year_and_season
};

/**
 * Constructor
 *
 * @class BaseRoute
 */
export class BaseRoute {
	protected title: string;
	protected navPos: number;

	/**
	 * Constructor
	 *
	 * @class BaseRoute
	 * @constructor
	 */
	constructor() {
		//initialize variables
		this.title = "SNU Computer Programming";
	}

	/**
	 * Render a page.
	 *
	 * @class BaseRoute
	 * @method render
	 * @param req {Request} The request object.
	 * @param res {Response} The response object.
	 * @param view {String} The view to render.
	 * @return void
	 */
	public render(req: Request, res: Response, view: string) {
		//add constants
		res.locals.BASE_URL = "/";

		// add variables
		res.locals.title = this.title;
		res.locals.navPos = this.navPos;
		res.locals.signIn = req.session.signIn;
		res.locals.admin = req.session.admin;
		res.locals.name = req.session.name;

		//render view
		return res.render(view, renderOption);
	}
}