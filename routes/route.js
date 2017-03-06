"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
     * @param options {Object} Additional options to append to the view's local scope.
     * @return void
     */
    BaseRoute.prototype.render = function (req, res, view, options) {
        //add constants
        res.locals.BASE_URL = "/";
        // add variables
        res.locals.title = this.title;
        res.locals.navPos = this.navPos;
        res.locals.signIn = req.session.signIn;
        res.locals.admin = req.session.admin;
        res.locals.name = req.session.name;
        //render view
        res.render(view, options);
    };
    return BaseRoute;
}());
exports.BaseRoute = BaseRoute;
