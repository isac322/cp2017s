"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var route_1 = require("./route");
/**
 * /homework route
 *
 * @class HWRoute
 */
var HWRoute = (function (_super) {
    __extends(HWRoute, _super);
    /**
     * Constructor
     *
     * @class HWRoute
     * @constructor
     */
    function HWRoute() {
        var _this = _super.call(this) || this;
        _this.navPos = 2;
        return _this;
    }
    /**
     * Create /homework routes.
     *
     * @class IndexRoute
     * @method create
     * @static
     */
    HWRoute.create = function (router) {
        //log
        console.log("[HWRoute::create] Creating homework route.");
        var hwRouter = new HWRoute();
        //add homework page route
        router.get("/homework", function (req, res, next) {
            hwRouter.homework(req, res, next);
        });
        router.get('/homework/add', function (req, res, next) {
            hwRouter.add(req, res, next);
        });
    };
    /**
     * The homework page route.
     *
     * @class HWRoute
     * @method homework
     * @param req {Request} The express Request object.
     * @param res {Response} The express Response object.
     * @param next {NextFunction} Execute the next method.
     */
    HWRoute.prototype.homework = function (req, res, next) {
        this.title = 'homework list';
        if (!req.session.signIn) {
            res.redirect('/');
        }
        else {
            //render template
            this.render(req, res, 'homework');
            next();
        }
    };
    /**
     * The homework issuing page route.
     *
     * @class add
     * @method add
     * @param req {Request} The express Request object.
     * @param res {Response} The express Response object.
     * @param next {NextFunction} Execute the next method.
     */
    HWRoute.prototype.add = function (req, res, next) {
        this.title = 'making homework';
        if (!req.session.admin) {
            res.redirect('/homework');
        }
        else {
            //render template
            this.render(req, res, 'homework_add');
            next();
        }
    };
    return HWRoute;
}(route_1.BaseRoute));
exports.HWRoute = HWRoute;
