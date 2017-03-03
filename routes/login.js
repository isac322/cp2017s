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
 * / route
 *
 * @class User
 */
var LoginRoute = (function (_super) {
    __extends(LoginRoute, _super);
    /**
     * Constructor
     *
     * @class LoginRoute
     * @constructor
     */
    function LoginRoute() {
        return _super.call(this) || this;
    }
    /**
     * Create the routes.
     *
     * @class LoginRoute
     * @method create
     * @static
     */
    LoginRoute.create = function (router) {
        console.log("[IndexRoute::create] Creating login route.");
        router.get("/login", function (req, res, next) {
            new LoginRoute().index(req, res, next);
        });
    };
    /**
     * The home page route.
     *
     * @class LoginRoute
     * @method index
     * @param req {Request} The express Request object.
     * @param res {Response} The express Response object.
     * @next {NextFunction} Execute the next method.
     */
    LoginRoute.prototype.index = function (req, res, next) {
        //set custom title
        this.title = "Home | Tour of Heros";
        //set options
        var options = {
            "message": "Welcome to the Tour of Heros"
        };
        //render template
        this.render(req, res, "login", options);
    };
    return LoginRoute;
}(route_1.BaseRoute));
exports.LoginRoute = LoginRoute;
