"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var mysql_1 = require("mysql");
var util = require("util");
var app_1 = require("../../app");
var async = require("async");
var dbConfig = JSON.parse(fs.readFileSync('config/database.json', 'utf-8'));
var dbClient = mysql_1.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database
});
var rowsInPage = 30;
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
    if (!('p' in req.query))
        req.query.p = '0';
    var query = req.query;
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
    var exerciseQuery = commonQuery;
    if (query.ex)
        exerciseQuery += ' AND attachment_id IN (' + mysql_1.escape(query.ex) + ')';
    if (query.r)
        exerciseQuery += ' AND type IN (' + mysql_1.escape(query.r) + ')';
    var homeworkQuery = commonQuery;
    if (query.hw)
        homeworkQuery += ' AND attachment_id IN (' + mysql_1.escape(query.hw) + ')';
    var projectQuery = commonQuery;
    if (query.pj)
        projectQuery += ' AND attachment_id IN (' + mysql_1.escape(query.pj) + ')';
    var queryStr;
    switch (query.t) {
        case '0':
            var queryArray = [];
            if (query.hw == null && query.ex == null && query.pj == null) {
                queryArray.push('(SELECT ' + genHomeworkQuery(homeworkQuery) + ')');
                queryArray.push('(SELECT ' + genExerciseQuery(exerciseQuery) + ')');
                queryArray.push('(SELECT ' + genProjectQuery(projectQuery) + ')');
            }
            else {
                if (query.hw)
                    queryArray.push('(SELECT ' + genHomeworkQuery(homeworkQuery) + ')');
                if (query.ex)
                    queryArray.push('(SELECT ' + genExerciseQuery(exerciseQuery) + ')');
                if (query.pj)
                    queryArray.push('(SELECT ' + genProjectQuery(projectQuery) + ')');
            }
            queryStr = '* FROM (' + queryArray.join('UNION ALL') + ') AS a';
            break;
        case '1':
            queryStr = genHomeworkQuery(homeworkQuery);
            break;
        case '2':
            queryStr = genExerciseQuery(exerciseQuery);
            break;
        case '3':
            queryStr = genProjectQuery(projectQuery);
            break;
    }
    async.series([
        function (callback) {
            dbClient.query('SELECT SQL_CALC_FOUND_ROWS ' + queryStr + ' ORDER BY timestamp DESC LIMIT ?, ?;', [Number(query.p) * rowsInPage, rowsInPage], callback);
        },
        function (callback) {
            dbClient.query('SELECT FOUND_ROWS() AS total;', callback);
        }
    ], function (err, result) {
        if (err) {
            app_1.logger.error('[rest_api::history::historyList::search] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
            res.sendStatus(500);
            return;
        }
        res.json({
            data: result[0][0],
            total: Math.floor((result[1][0][0].total + rowsInPage - 1) / rowsInPage),
            p: Number(query.p)
        });
    });
    function genHomeworkQuery(homeworkQuery) {
        if (req.session.admin) {
            return '' +
                'homework_log.id, user.student_id AS `studentId`, email, submitted AS `timestamp`, homework_config.name AS `fileName`, extension, NULL AS `result`, \'Homework\' AS `category`, user.name ' +
                'FROM homework_log ' +
                '    JOIN homework_config ON homework_log.attachment_id = homework_config.id ' +
                '    JOIN user ON homework_log.student_id = user.student_id ' +
                'WHERE ' + homeworkQuery;
        }
        else {
            return '' +
                'homework_log.id, student_id AS `studentId`, email, submitted AS `timestamp`, homework_config.name AS `fileName`, extension, NULL AS `result`, \'Homework\' AS `category` ' +
                'FROM homework_log ' +
                '    JOIN homework_config ON homework_log.attachment_id = homework_config.id ' +
                'WHERE ' + homeworkQuery;
        }
    }
    function genExerciseQuery(exerciseQuery) {
        if (req.session.admin) {
            return '' +
                'exercise_log.id, user.student_id AS `studentId`, email, submitted AS `timestamp`, exercise_config.name AS `fileName`, extension, type AS `result`, \'Exercise\' AS `category`, user.name ' +
                'FROM exercise_log ' +
                '    JOIN exercise_config ON exercise_log.attachment_id = exercise_config.id ' +
                '    LEFT JOIN exercise_result ON exercise_log.id = exercise_result.log_id ' +
                '    JOIN user ON user.student_id = exercise_log.student_id ' +
                'WHERE ' + exerciseQuery;
        }
        else {
            return '' +
                'exercise_log.id, student_id AS `studentId`, email, submitted AS `timestamp`, exercise_config.name AS `fileName`, extension, type AS `result`, \'Exercise\' AS `category` ' +
                'FROM exercise_log ' +
                '    JOIN exercise_config ON exercise_log.attachment_id = exercise_config.id ' +
                '    LEFT JOIN exercise_result ON exercise_log.id = exercise_result.log_id ' +
                'WHERE ' + exerciseQuery;
        }
    }
    function genProjectQuery(projectQuery) {
        if (req.session.admin) {
            return '' +
                'project_log.id, user.student_id AS `studentId`, email, submitted AS `timestamp`, project_config.name AS `fileName`, extension, NULL AS `result`, \'project\' AS `category`, user.name ' +
                'FROM project_log ' +
                '    JOIN project_config ON project_log.attachment_id = project_config.id ' +
                '    JOIN user ON project_log.student_id = user.student_id ' +
                'WHERE ' + projectQuery;
        }
        else {
            return '' +
                'project_log.id, student_id AS `studentId`, email, submitted AS `timestamp`, project_config.name AS `fileName`, extension, NULL AS `result`, \'project\' AS `category` ' +
                'FROM project_log ' +
                '    JOIN project_config ON project_log.attachment_id = project_config.id ' +
                'WHERE ' + projectQuery;
        }
    }
}
exports.historyList = historyList;
