"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var mysql_1 = require("mysql");
var app_1 = require("../../app");
var util = require("util");
var dbConfig = JSON.parse(fs.readFileSync('config/database.json', 'utf-8'));
var dbClient = mysql_1.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database
});
/**
 * Send history data.
 *
 * @method historyList
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
function historyList(req, res) {
    if (!req.session.signIn)
        return res.sendStatus(401);
    if (!('t' in req.query)) {
        req.query.t = '3';
    }
    var query = req.query;
    if (query.ex === null && query.hw === null)
        query.t = 3;
    else if (query.ex !== null)
        query.t = 2;
    else if (query.hw !== null)
        query.t = 1;
    var commonQuery = '';
    if (req.session.admin) {
        if (query.u)
            commonQuery += 'user.student_id IN (' + mysql_1.escape(query.u) + ')';
        else
            commonQuery += 'user.student_id = ' + mysql_1.escape(req.session.studentId);
    }
    else
        commonQuery += 'student_id = ' + mysql_1.escape(req.session.studentId);
    if (query.e)
        commonQuery += ' AND email IN (' + mysql_1.escape(query.e) + ')';
    var tasks = [];
    if (query.t & 2) {
        var exerciseQuery_1 = commonQuery;
        if (query.ex)
            exerciseQuery_1 += ' AND attachment_id IN (' + mysql_1.escape(query.ex) + ')';
        if (query.r)
            exerciseQuery_1 += ' AND type IN (' + mysql_1.escape(query.r) + ')';
        if (req.session.admin) {
            tasks.push(function (callback) {
                dbClient.query('SELECT exercise_log.id, user.student_id AS `studentId`, email, submitted AS `timestamp`, exercise_config.name AS `fileName`, extension, type AS `result`, "Exercise" AS `category`, user.name ' +
                    'FROM exercise_log ' +
                    '    JOIN exercise_config ON exercise_log.attachment_id = exercise_config.id ' +
                    '    LEFT JOIN exercise_result ON exercise_log.id = exercise_result.log_id ' +
                    '    JOIN user ON user.student_id = exercise_log.student_id ' +
                    'WHERE ' + exerciseQuery_1 + ' ' +
                    'ORDER BY submitted DESC', callback);
            });
        }
        else {
            tasks.push(function (callback) {
                dbClient.query('SELECT exercise_log.id, student_id AS `studentId`, email, submitted AS `timestamp`, name AS `fileName`, extension, type AS `result`, "Exercise" AS `category` ' +
                    'FROM exercise_log ' +
                    '    JOIN exercise_config ON exercise_log.attachment_id = exercise_config.id ' +
                    '    LEFT JOIN exercise_result ON exercise_log.id = exercise_result.log_id ' +
                    'WHERE ' + exerciseQuery_1 + ' ' +
                    'ORDER BY submitted DESC', callback);
            });
        }
    }
    if (query.t & 1) {
        var homeworkQuery_1 = commonQuery;
        if (query.hw)
            homeworkQuery_1 += ' AND attachment_id IN (' + mysql_1.escape(query.hw) + ')';
        if (req.session.admin) {
            tasks.push(function (callback) {
                dbClient.query('SELECT homework_log.id, user.student_id AS `studentId`, email, submitted AS `timestamp`, homework_config.name AS `fileName`, extension, "Homework" AS `category`, user.name ' +
                    'FROM homework_log ' +
                    '    JOIN homework_config ON homework_log.attachment_id = homework_config.id ' +
                    '    JOIN user ON homework_log.student_id = user.student_id ' +
                    'WHERE ' + homeworkQuery_1 + ' ' +
                    'ORDER BY submitted', callback);
            });
        }
        else {
            tasks.push(function (callback) {
                dbClient.query('SELECT homework_log.id, student_id AS `studentId`, email, submitted AS `timestamp`, name AS `fileName`, extension, "Homework" AS `category` ' +
                    'FROM homework_log ' +
                    '    JOIN homework_config ON homework_log.attachment_id = homework_config.id ' +
                    'WHERE ' + homeworkQuery_1 + ' ' +
                    'ORDER BY submitted', callback);
            });
        }
    }
    async.parallel(tasks, function (err, results) {
        if (err) {
            app_1.logger.error('[rest_api::historyList::search] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
            res.sendStatus(500);
            return;
        }
        if (results.length == 2)
            res.json(results[0][0].concat(results[1][0]));
        else
            res.json(results[0][0]);
    });
}
exports.historyList = historyList;
