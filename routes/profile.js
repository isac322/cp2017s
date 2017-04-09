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
var app_1 = require("../app");
/**
 * /profile route
 *
 * @class ProfileRoute
 */
var ProfileRoute = (function (_super) {
    __extends(ProfileRoute, _super);
    /**
     * Constructor
     *
     * @class ProfileRoute
     * @constructor
     */
    function ProfileRoute() {
        var _this = _super.call(this) || this;
        _this.navPos = 99;
        return _this;
    }
    /**
     * Create the routes.
     *
     * @class ProfileRoute
     * @method create
     * @static
     */
    ProfileRoute.create = function (router) {
        //log
        app_1.logger.debug('[ProfileRoute::create] Creating profile route.');
        //add home page route
        router.get('/profile', function (req, res, next) {
            new ProfileRoute().profile(req, res, next);
        });
    };
    /**
     * The profile page route.
     *
     * @class ProfileRoute
     * @method profile
     * @param req {Request} The express Request object.
     * @param res {Response} The express Response object.
     * @param next {NextFunction} Execute the next method.
     */
    ProfileRoute.prototype.profile = function (req, res, next) {
        this.title = 'Profile';
        if (!req.session.signIn) {
            return res.redirect('/');
        }
        //render template
        this.render(req, res, 'profile');
    };
    return ProfileRoute;
}(route_1.BaseRoute));
exports.ProfileRoute = ProfileRoute;
