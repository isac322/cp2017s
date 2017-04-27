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
 * /board route
 *
 * @class BoardRoute
 */
var BoardRoute = (function (_super) {
    __extends(BoardRoute, _super);
    /**
     * Constructor
     *
     * @class BoardRoute
     * @constructor
     */
    function BoardRoute() {
        var _this = _super.call(this) || this;
        _this.navPos = 6;
        return _this;
    }
    /**
     * Create the routes.
     *
     * @class ProfileRoute
     * @method create
     * @static
     */
    BoardRoute.create = function (router) {
        //log
        app_1.logger.debug('[BoardRoute::create] Creating board route.');
        //add home page route
        router.get('/board', function (req, res, next) {
            new BoardRoute().board(req, res, next);
        });
    };
    /**
     * The board page route.
     *
     * @class BoardRoute
     * @method board
     * @param req {Request} The express Request object.
     * @param res {Response} The express Response object.
     * @param next {NextFunction} Execute the next method.
     */
    BoardRoute.prototype.board = function (req, res, next) {
        this.title = 'Web board';
        if (!req.session.signIn) {
            return res.redirect('/');
        }
        //render template
        this.render(req, res, 'board');
    };
    return BoardRoute;
}(route_1.BaseRoute));
exports.BoardRoute = BoardRoute;
