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
var rest_api_1 = require("./rest_api");
var route_1 = require("./route");
var homework_1 = require("./homework");
/**
 * /project route
 *
 * @class ProjectRoute
 */
var ProjectRoute = (function (_super) {
    __extends(ProjectRoute, _super);
    /**
     * Constructor
     *
     * @class ProjectRoute
     * @constructor
     */
    function ProjectRoute() {
        var _this = _super.call(this) || this;
        _this.navPos = 4;
        return _this;
    }
    /**
     * Create /project routes.
     *
     * @class ProjectRoute
     * @method create
     * @static
     */
    ProjectRoute.create = function (router) {
        //log
        app_1.logger.debug('[ProjectRoute::create] Creating project route.');
        var projectRoute = new ProjectRoute();
        //add project page route
        router.get('/project', function (req, res, next) {
            projectRoute.project(req, res, next);
        });
        router.get('/project/add', function (req, res, next) {
            projectRoute.add(req, res, next);
        });
    };
    /**
     * The project page route.
     *
     * @class ProjectRoute
     * @method project
     * @param req {Request} The express Request object.
     * @param res {Response} The express Response object.
     * @param next {NextFunction} Execute the next method.
     */
    ProjectRoute.prototype.project = function (req, res, next) {
        var _this = this;
        this.title = 'Project List';
        if (!req.session.signIn)
            return res.redirect('/');
        rest_api_1.dbClient.query(req.session.signIn ? ProjectRoute.pjQuery(req.session.studentId) : ProjectRoute.guestPjQuery, function (err, searchResult) {
            if (err) {
                app_1.logger.error('[ProjectRoute::project]');
                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                res.sendStatus(500);
                return;
            }
            var currentId = -1;
            var currentObject;
            var project = [];
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
                    project.push(currentObject);
                    currentId = record.id;
                }
                currentObject.attachments.push({
                    id: record.file_id,
                    name: decodeURIComponent(record.file_name),
                    submitted: record.submitted
                });
            }
            app_1.logger.debug(util.inspect(project, { showHidden: false, depth: 1 }));
            res.locals.projectList = project.reverse();
            //render template
            _this.render(req, res, 'project');
        });
    };
    /**
     * The project issuing page route.
     *
     * @class ProjectRoute
     * @method add
     * @param req {Request} The express Request object.
     * @param res {Response} The express Response object.
     * @param next {NextFunction} Execute the next method.
     */
    ProjectRoute.prototype.add = function (req, res, next) {
        this.title = 'Create Project';
        if (!req.session.admin) {
            return res.redirect('/project');
        }
        else {
            //render template
            return this.render(req, res, 'project_add');
        }
    };
    return ProjectRoute;
}(route_1.BaseRoute));
ProjectRoute.pjQuery = function (studentId) {
    return '' +
        'SELECT project.id, project.name, start_date, end_date, description, ' +
        '		project_config.id AS `file_id`, project_config.name AS `file_name`, extension AS `file_extension`, ' +
        '		(reduced_submit.attachment_id IS NOT NULL) AS submitted ' +
        'FROM project ' +
        '	LEFT JOIN project_config ' +
        '		ON project.id = project_config.project_id ' +
        '	LEFT JOIN ( ' +
        '				SELECT attachment_id ' +
        '				FROM project_log ' +
        '				WHERE student_id = "' + studentId + '" ' +
        '				GROUP BY attachment_id ' +
        '			) AS reduced_submit ' +
        '		ON project_config.id = reduced_submit.attachment_id;';
};
ProjectRoute.guestPjQuery = 'SELECT project.id, project.name, project.start_date, project.end_date, project.description,' +
    '       project_config.name AS `file_name`, project_config.extension AS `file_extension` ' +
    'FROM project ' +
    '        LEFT JOIN project_config ' +
    '            ON project.id = project_config.project_id;';
exports.ProjectRoute = ProjectRoute;
