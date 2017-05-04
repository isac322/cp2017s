"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var webConfig = JSON.parse(fs.readFileSync('config/web.json', 'utf-8'));
var renderOption = {
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
var BaseRoute = (function () {
    /**
     * Constructor
     *
     * @class BaseRoute
     * @constructor
     */
    function BaseRoute() {
        //initialize variables
        this.title = 'SNU Computer Programming';
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
    BaseRoute.prototype.render = function (req, res, view) {
        //add constants
        res.locals.BASE_URL = '/';
        // add variables
        res.locals.originalTitle = this.title;
        res.locals.title = this.title + ' - ' + renderOption.shortName;
        res.locals.navPos = this.navPos;
        res.locals.signIn = req.session.signIn;
        res.locals.admin = req.session.admin;
        res.locals.name = req.session.name;
        //render view
        return res.render(view, renderOption);
    };
    return BaseRoute;
}());
exports.BaseRoute = BaseRoute;
