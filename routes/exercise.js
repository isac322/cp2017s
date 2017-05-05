"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mysql_1 = require("mysql");
const util = require("util");
const app_1 = require("../app");
const homework_1 = require("./homework");
const route_1 = require("./route");
const fs = require("fs");
const dbConfig = JSON.parse(fs.readFileSync('config/database.json', 'utf-8'));
const dbClient = mysql_1.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database
});
class ExerciseRoute extends route_1.BaseRoute {
    static create(router) {
        app_1.logger.debug('[ExerciseRoute::create] Creating exercise route.');
        router.get('/exercise', (req, res, next) => {
            new ExerciseRoute().exercise(req, res, next);
        });
    }
    constructor() {
        super();
        this.navPos = 3;
    }
    exercise(req, res, next) {
        this.title = 'Exercise';
        if (!req.session.signIn)
            return res.redirect('/');
        dbClient.query('SELECT exercise.id, exercise.name, exercise.start_date, exercise.end_date, exercise.description, ' +
            '       exercise_config.id AS `attach_id`, exercise_config.name AS `file_name`, ' +
            '       (result_table.student_id IS NOT NULL) as result ' +
            'FROM exercise ' +
            '    JOIN exercise_config ' +
            '        ON exercise.id = exercise_config.exercise_id ' +
            '    LEFT JOIN view_exercise_quick_result AS result_table ' +
            '        ON exercise_config.id = result_table.attachment_id AND result_table.student_id = ?;', req.session.studentId, (err, searchResult) => {
            if (err) {
                app_1.logger.error('[exercise::first_select]');
                app_1.logger.error(util.inspect(err, { showHidden: false }));
                res.sendStatus(500);
                return;
            }
            let currentId = -1;
            let currentObject;
            let exerciseList = [];
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
                    exerciseList.push(currentObject);
                    currentId = record.id;
                }
                currentObject.attachments.push({
                    id: record.attach_id,
                    name: decodeURIComponent(record.file_name),
                    result: record.result
                });
            }
            app_1.logger.debug(util.inspect(exerciseList, { showHidden: false, depth: 1 }));
            res.locals.exerciseList = exerciseList.reverse();
            return this.render(req, res, 'exercise');
        });
    }
}
exports.ExerciseRoute = ExerciseRoute;
//# sourceMappingURL=exercise.js.map