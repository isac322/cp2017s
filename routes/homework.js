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
var route_1 = require("./route");
var fs = require("fs");
var mysql_1 = require("mysql");
var dbConfig = JSON.parse(fs.readFileSync('config/database.json', 'utf-8'));
var dbClient = mysql_1.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database
});
exports.monthNames = [
    "January", "February", "March",
    "April", "May", "June", "July",
    "August", "September", "October",
    "November", "December"
];
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
     * @class HWRoute
     * @method create
     * @static
     */
    HWRoute.create = function (router) {
        //log
        app_1.logger.debug('[HWRoute::create] Creating homework route.');
        var hwRouter = new HWRoute();
        //add homework page route
        router.get('/homework', function (req, res, next) {
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
        var _this = this;
        this.title = 'Homework List';
        dbClient.query(req.session.signIn ? HWRoute.hwQuery(req.session.studentId) : HWRoute.guestHwQuery, function (err, searchResult) {
            if (err) {
                app_1.logger.error('[HWRoute::homework]');
                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                res.sendStatus(500);
                return;
            }
            var currentId = -1;
            var currentObject;
            var homework = [];
            for (var _i = 0, searchResult_1 = searchResult; _i < searchResult_1.length; _i++) {
                var record = searchResult_1[_i];
                if (record.homework_id != currentId) {
                    currentObject = {
                        id: record.homework_id,
                        name: decodeURIComponent(record.name),
                        startDate: exports.monthNames[record.start_date.getMonth()] + ' ' + record.start_date.getDate(),
                        dueDate: exports.monthNames[record.end_date.getMonth()] + ' ' + record.end_date.getDate(),
                        description: record.description.split('|'),
                        leftMillis: record.end_date - Date.now() + 24 * 60 * 60 * 1000,
                        attachments: []
                    };
                    homework.push(currentObject);
                    currentId = record.homework_id;
                }
                currentObject.attachments.push({
                    id: record.file_id,
                    name: decodeURIComponent(record.file_name),
                    submitted: record.submitted
                });
            }
            app_1.logger.debug(util.inspect(homework, { showHidden: false, depth: 1 }));
            res.locals.homeworkList = homework.reverse();
            //render template
            _this.render(req, res, 'homework');
        });
    };
    /**
     * The homework issuing page route.
     *
     * @class HWRoute
     * @method add
     * @param req {Request} The express Request object.
     * @param res {Response} The express Response object.
     * @param next {NextFunction} Execute the next method.
     */
    HWRoute.prototype.add = function (req, res, next) {
        this.title = 'Create Homework';
        if (!req.session.admin) {
            return res.redirect('/homework');
        }
        else {
            //render template
            return this.render(req, res, 'homework_add');
        }
    };
    return HWRoute;
}(route_1.BaseRoute));
HWRoute.hwQuery = function (studentId) {
    return '' +
        'SELECT homework.homework_id, homework.name, start_date, end_date, description, ' +
        '		homework_config.id AS `file_id`, homework_config.name AS `file_name`, extension AS `file_extension`, ' +
        '		(reduced_submit.attachment_id IS NOT NULL) AS submitted ' +
        'FROM homework ' +
        '	LEFT JOIN homework_config ' +
        '		ON homework.homework_id = homework_config.homework_id ' +
        '	LEFT JOIN ( ' +
        '				SELECT attachment_id ' +
        '				FROM homework_log ' +
        '				WHERE student_id = "' + studentId + '" ' +
        '				GROUP BY attachment_id ' +
        '			) AS reduced_submit ' +
        '		ON homework_config.id = reduced_submit.attachment_id;';
};
HWRoute.guestHwQuery = 'SELECT homework.homework_id, homework.name, homework.start_date, homework.end_date, homework.description,' +
    '		homework_config.name AS `file_name`, homework_config.extension AS `file_extension` ' +
    'FROM homework ' +
    '	LEFT JOIN homework_config ' +
    '		ON homework.homework_id = homework_config.homework_id;';
exports.HWRoute = HWRoute;
