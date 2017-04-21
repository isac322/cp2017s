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
var util = require("util");
var app_1 = require("../app");
var homework_1 = require("./homework");
var rest_api_1 = require("./rest_api");
var route_1 = require("./route");
/**
 * /exercise route
 *
 * @class ExerciseRoute
 */
var ExerciseRoute = (function (_super) {
    __extends(ExerciseRoute, _super);
    /**
     * Constructor
     *
     * @class ExerciseRoute
     * @constructor
     */
    function ExerciseRoute() {
        var _this = _super.call(this) || this;
        _this.navPos = 3;
        return _this;
    }
    /**
     * Create the routes.
     *
     * @class ExerciseRoute
     * @method create
     * @static
     */
    ExerciseRoute.create = function (router) {
        //log
        app_1.logger.debug('[ExerciseRoute::create] Creating exercise route.');
        //add exercise page route
        router.get('/exercise', function (req, res, next) {
            new ExerciseRoute().exercise(req, res, next);
        });
    };
    /**
     * The exercise page route.
     *
     * @class ExerciseRoute
     * @method exercise
     * @param req {Request} The express Request object.
     * @param res {Response} The express Response object.
     * @param next {NextFunction} Execute the next method.
     */
    ExerciseRoute.prototype.exercise = function (req, res, next) {
        var _this = this;
        this.title = 'Exercise';
        if (!req.session.signIn) {
            return res.redirect('/');
        }
        rest_api_1.dbClient.query('SELECT exercise.id, exercise.name, exercise.start_date, exercise.end_date, exercise.description, ' +
            '       exercise_config.id AS `attach_id`, exercise_config.name AS `file_name`, result ' +
            'FROM exercise JOIN exercise_config ' +
            '        ON exercise.id = exercise_config.exercise_id ' +
            '    LEFT JOIN ( ' +
            '                  SELECT * ' +
            '                  FROM exercise_quick_result ' +
            '                  WHERE student_id = ? ' +
            '              ) AS reduced_quick_result ' +
            '        ON exercise_config.id = reduced_quick_result.attach_id;', req.session.studentId, function (err, searchResult) {
            if (err) {
                app_1.logger.error('[exercise::first_select]');
                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                res.sendStatus(500);
                return;
            }
            var currentId = -1;
            var currentObject;
            var exerciseList = [];
            for (var _i = 0, searchResult_1 = searchResult; _i < searchResult_1.length; _i++) {
                var record = searchResult_1[_i];
                if (record.id != currentId) {
                    currentObject = {
                        id: record.id,
                        name: decodeURIComponent(record.name),
                        startDate: homework_1.monthNames[record.start_date.getMonth()] + ' ' + record.start_date.getDate(),
                        dueDate: homework_1.monthNames[record.end_date.getMonth()] + ' ' + record.end_date.getDate(),
                        description: record.description.split('|'),
                        leftMillis: record.end_date - Date.now() + 24 * 60 * 60 * 1000,
                        attachments: []
                    };
                    exerciseList.push(currentObject);
                    currentId = record.id;
                }
                currentObject.attachments.push({
                    id: record.attach_id,
                    name: record.file_name,
                    result: record.result
                });
            }
            app_1.logger.debug(util.inspect(exerciseList, { showHidden: false, depth: 1 }));
            res.locals.exerciseList = exerciseList;
            //render template
            return _this.render(req, res, 'exercise');
        });
    };
    return ExerciseRoute;
}(route_1.BaseRoute));
exports.ExerciseRoute = ExerciseRoute;
