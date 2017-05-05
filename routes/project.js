"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("util");
const app_1 = require("../app");
const route_1 = require("./route");
const homework_1 = require("./homework");
const fs = require("fs");
const mysql_1 = require("mysql");
const dbConfig = JSON.parse(fs.readFileSync('config/database.json', 'utf-8'));
const dbClient = mysql_1.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database
});
class ProjectRoute extends route_1.BaseRoute {
    constructor() {
        super();
        this.navPos = 4;
    }
    static create(router) {
        app_1.logger.debug('[ProjectRoute::create] Creating project route.');
        const projectRoute = new ProjectRoute();
        router.get('/project', (req, res, next) => {
            projectRoute.project(req, res, next);
        });
        router.get('/project/add', (req, res, next) => {
            projectRoute.add(req, res, next);
        });
    }
    project(req, res, next) {
        this.title = 'Project List';
        if (!req.session.signIn)
            return res.redirect('/');
        dbClient.query(req.session.signIn ? ProjectRoute.pjQuery(req.session.studentId) : ProjectRoute.guestPjQuery, (err, searchResult) => {
            if (err) {
                app_1.logger.error('[ProjectRoute::project]');
                app_1.logger.error(util.inspect(err, { showHidden: false }));
                res.sendStatus(500);
                return;
            }
            let currentId = -1;
            let currentObject;
            let project = [];
            for (let record of searchResult) {
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
            this.render(req, res, 'project');
        });
    }
    add(req, res, next) {
        this.title = 'Create Project';
        if (!req.session.admin) {
            return res.redirect('/project');
        }
        else {
            return this.render(req, res, 'project_add');
        }
    }
}
ProjectRoute.pjQuery = (studentId) => {
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
//# sourceMappingURL=project.js.map