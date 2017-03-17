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
 * /attendance route
 *
 * @class AttendanceRoute
 */
var AttendanceRoute = (function (_super) {
    __extends(AttendanceRoute, _super);
    /**
     * Constructor
     *
     * @class AttendanceRoute
     * @constructor
     */
    function AttendanceRoute() {
        var _this = _super.call(this) || this;
        _this.navPos = 3;
        return _this;
    }
    /**
     * Create the routes.
     *
     * @class AttendanceRoute
     * @method create
     * @static
     */
    AttendanceRoute.create = function (router) {
        //log
        console.log("[AttendanceRoute::create] Creating attendance route.");
        //add attendance page route
        router.get("/attendance", function (req, res, next) {
            new AttendanceRoute().attendance(req, res, next);
        });
    };
    /**
     * The attendance page route.
     *
     * @class AttendanceRoute
     * @method attendance
     * @param req {Request} The express Request object.
     * @param res {Response} The express Response object.
     * @param next {NextFunction} Execute the next method.
     */
    AttendanceRoute.prototype.attendance = function (req, res, next) {
        this.title = 'Attendance';
        if (!req.session.signIn) {
            res.redirect('/');
        }
        else {
            //render template
            this.render(req, res, "attendance");
        }
    };
    return AttendanceRoute;
}(route_1.BaseRoute));
exports.AttendanceRoute = AttendanceRoute;
