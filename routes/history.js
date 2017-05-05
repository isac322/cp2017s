"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const route_1 = require("./route");
const app_1 = require("../app");
const util = require("util");
const async = require("async");
const fs = require("fs");
const mysql_1 = require("mysql");
const dbConfig = JSON.parse(fs.readFileSync('config/database.json', 'utf-8'));
const dbClient = mysql_1.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database
});
class HistoryRoute extends route_1.BaseRoute {
    static create(router) {
        app_1.logger.debug('[HistoryRoute::create] Creating history route.');
        router.get('/history', (req, res, next) => new HistoryRoute().history(req, res, next));
    }
    constructor() {
        super();
        this.navPos = 5;
    }
    history(req, res, next) {
        if (!req.session.signIn)
            return res.redirect('/');
        this.title = 'History';
        const tasks = [];
        tasks.push((callback) => dbClient.query('SELECT email FROM email WHERE student_id = ?;', req.session.studentId, callback));
        tasks.push((callback) => dbClient.query('SELECT homework.name AS `homeworkName`, homework_config.name AS `fileName`, homework_config.id ' +
            'FROM homework JOIN homework_config ON homework.homework_id = homework_config.homework_id;', callback));
        tasks.push((callback) => dbClient.query('SELECT exercise.name  AS `exerciseName`, exercise_config.name AS `fileName`, exercise_config.id ' +
            'FROM exercise JOIN exercise_config ON exercise.id = exercise_config.exercise_id', callback));
        tasks.push((callback) => dbClient.query('SELECT project.name  AS `projectName`, project_config.name AS `fileName`, project_config.id ' +
            'FROM project JOIN project_config ON project.id = project_config.project_id', callback));
        if (req.session.admin) {
            tasks.push((callback) => dbClient.query('SELECT name, student_id FROM user ORDER BY name;', callback));
        }
        async.parallel(tasks, (err, data) => {
            if (err) {
                app_1.logger.error('[history::searching_in_parallel]');
                app_1.logger.error(util.inspect(err, { showHidden: false, depth: undefined }));
                res.sendStatus(500);
                return;
            }
            res.locals.emailList = data[0][0];
            res.locals.homeworkList = data[1][0];
            res.locals.exerciseList = data[2][0];
            res.locals.projectList = data[3][0];
            if (req.session.admin)
                res.locals.userList = data[4][0];
            this.render(req, res, 'history');
        });
    }
}
exports.HistoryRoute = HistoryRoute;
//# sourceMappingURL=history.js.map