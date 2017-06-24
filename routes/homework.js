"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("util");
const app_1 = require("../app");
const route_1 = require("./route");
const fs = require("fs");
const mysql_1 = require("mysql");
const async = require("async");
const dbConfig = JSON.parse(fs.readFileSync('config/database.json', 'utf-8'));
const dbClient = mysql_1.createConnection({
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
class HWRoute extends route_1.BaseRoute {
    constructor() {
        super();
        this.navPos = 2;
    }
    static create(router) {
        app_1.logger.debug('[HWRoute::create] Creating homework route.');
        const hwRouter = new HWRoute();
        router.get('/homework', (req, res) => {
            hwRouter.homework(req, res);
        });
        router.get('/homework/add', (req, res) => {
            hwRouter.add(req, res);
        });
        router.get('/homework/judge/:homeworkId([0-9]+)', (req, res) => {
            hwRouter.judge(req, res);
        });
    }
    homework(req, res) {
        this.title = 'Homework List';
        dbClient.query(req.session.signIn ? HWRoute.hwQuery(req.session.studentId) : HWRoute.guestHwQuery, (err, searchResult) => {
            if (err) {
                app_1.logger.error('[HWRoute::homework]');
                app_1.logger.error(util.inspect(err, { showHidden: false }));
                res.sendStatus(500);
                return;
            }
            let currentId = -1;
            let currentObject;
            let homework = [];
            for (let record of searchResult) {
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
            this.render(req, res, 'homework');
        });
    }
    add(req, res) {
        this.title = 'Create Homework';
        if (!req.session.admin) {
            return res.redirect('/homework');
        }
        else {
            return this.render(req, res, 'homework_add');
        }
    }
    judge(req, res) {
        this.title = 'Judging Homework';
        if (!req.session.admin)
            return res.redirect('/homework');
        async.parallel([
            (callback) => dbClient.query('SELECT name, student_id FROM user WHERE NOT is_dropped ORDER BY name;', callback),
            (callback) => dbClient.query('SELECT homework_id, name FROM homework', callback),
            (callback) => dbClient.query('SELECT homework_board.* ' +
                'FROM homework_config JOIN homework_board ON homework_config.id = homework_board.attachment_id ' +
                'WHERE homework_id = ?;', req.params.homeworkId, callback),
            (callback) => dbClient.query('SELECT id, name, extension FROM homework_config WHERE homework_id = ?;', req.params.homeworkId, callback)
        ], (err, result) => {
            if (err) {
                app_1.logger.error('[HWRoute::judge]');
                app_1.logger.error(util.inspect(err, { showHidden: false }));
                res.sendStatus(500);
                return;
            }
            res.locals.userList = result[0][0];
            res.locals.homeworkList = result[1][0];
            res.locals.boardMap = result[2][0].reduce((prev, curr) => {
                let elem = prev[curr.student_id];
                const item = {
                    logId: curr.log_id,
                    attachId: curr.attachment_id,
                    submitted: curr.submitted.toLocaleString()
                };
                if (elem) {
                    elem.push(item);
                }
                else {
                    prev[curr.student_id] = [item];
                }
                return prev;
            }, {});
            res.locals.homeworkConfig = result[3][0].reduce((prev, curr) => {
                prev[curr.id] = {
                    name: decodeURIComponent(curr.name),
                    extension: curr.extension
                };
                return prev;
            }, {});
            res.locals.userMap = result[0][0].reduce((prev, curr) => {
                prev[curr.student_id] = decodeURIComponent(curr.name);
                return prev;
            }, {});
            res.locals.currentId = req.params.homeworkId;
            this.render(req, res, 'homework_manage');
        });
    }
}
HWRoute.hwQuery = (studentId) => {
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
HWRoute.rowInPage = 30;
exports.HWRoute = HWRoute;
