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
var rest_api_1 = require("./rest_api");
var app_1 = require("../app");
var util = require("util");
var async = require("async");
/**
 * /history route
 *
 * @class HistoryRoute
 */
var HistoryRoute = (function (_super) {
    __extends(HistoryRoute, _super);
    /**
     * Constructor
     *
     * @class HistoryRoute
     * @constructor
     */
    function HistoryRoute() {
        var _this = _super.call(this) || this;
        _this.navPos = 5;
        return _this;
    }
    /**
     * Create the routes.
     *
     * @class HistoryRoute
     * @method create
     * @static
     */
    HistoryRoute.create = function (router) {
        //log
        app_1.logger.debug('[HistoryRoute::create] Creating history route.');
        //add home page route
        router.get('/history', function (req, res, next) {
            new HistoryRoute().history(req, res, next);
        });
    };
    /**
     * The history page route.
     *
     * @class HistoryRoute
     * @method index
     * @param req {Request} The express Request object.
     * @param res {Response} The express Response object.
     * @param next {NextFunction} Execute the next method.
     */
    HistoryRoute.prototype.history = function (req, res, next) {
        var _this = this;
        if (!req.session.signIn)
            return res.redirect('/');
        this.title = 'History';
        var tasks = [];
        tasks.push(function (callback) {
            rest_api_1.dbClient.query('SELECT email FROM email WHERE student_id = ?;', req.session.studentId, callback);
        });
        tasks.push(function (callback) {
            rest_api_1.dbClient.query('SELECT homework.name AS `homeworkName`, homework_config.name AS `fileName`, homework_config.id ' +
                'FROM homework JOIN homework_config ON homework.homework_id = homework_config.homework_id;', callback);
        });
        tasks.push(function (callback) {
            rest_api_1.dbClient.query('SELECT exercise.name  AS `exerciseName`, exercise_config.name AS `fileName`, exercise_config.id ' +
                'FROM exercise JOIN exercise_config ON exercise.id = exercise_config.exercise_id', callback);
        });
        if (req.session.admin) {
            tasks.push(function (callback) {
                rest_api_1.dbClient.query('SELECT name, student_id FROM user ORDER BY name;', callback);
            });
        }
        async.parallel(tasks, function (err, data) {
            if (err) {
                app_1.logger.error('[history::searching_in_parallel]');
                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                res.sendStatus(500);
                return;
            }
            res.locals.emailList = data[0][0];
            res.locals.homeworkList = data[1][0];
            res.locals.exerciseList = data[2][0];
            if (req.session.admin)
                res.locals.userList = data[3][0];
            _this.render(req, res, 'history');
        });
    };
    return HistoryRoute;
}(route_1.BaseRoute));
exports.HistoryRoute = HistoryRoute;
