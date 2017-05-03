"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var crypto = require("crypto");
var fs = require("fs");
var util = require("util");
var app_1 = require("../../app");
var mysql_1 = require("mysql");
var path = require("path");
var dbConfig = JSON.parse(fs.readFileSync('config/database.json', 'utf-8'));
var dbClient = mysql_1.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database
});
/**
 * creating a new homework request api.
 *
 * @method createHomework
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
function createHomework(req, res) {
    if (!req.session.admin)
        return res.sendStatus(401);
    var name = encodeURIComponent(req.body.name);
    var start_date = req.body.start;
    var end_date = req.body.due;
    var description = req.body.description;
    dbClient.query('INSERT INTO homework(name, start_date, end_date, author_id, author_email, description) VALUES(?,?,?,?,?,?);', [name, start_date, end_date, req.session.studentId, req.session.email, description], function (err, insertResult) {
        if (err) {
            app_1.logger.error('[rest_api::createHomework::outer_insert] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
            res.sendStatus(500);
            return;
        }
        app_1.logger.debug('[rest_api::createHomework:insert into homework]');
        app_1.logger.debug(util.inspect(insertResult, { showHidden: false, depth: 1 }));
        var homeworkId = insertResult.insertId;
        var values = [];
        for (var _i = 0, _a = req.body.attachment; _i < _a.length; _i++) {
            var attachment = _a[_i];
            var fileName = encodeURIComponent(attachment.name);
            var extension = attachment.extension;
            values.push([homeworkId, fileName, extension]);
        }
        dbClient.query('INSERT INTO homework_config(homework_id, name, extension) VALUES ' + mysql_1.escape(values) + ';', function (err, result) {
            if (err) {
                app_1.logger.error('[rest_api::createHomework::inner_insert] : ');
                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                res.sendStatus(500);
                return;
            }
            app_1.logger.debug('[rest_api::createHomework:insert into homework_config]');
            app_1.logger.debug(util.inspect(result, { showHidden: false, depth: 1 }));
        });
        res.redirect('/homework');
    });
}
exports.createHomework = createHomework;
/**
 * The attachment upload request api.
 *
 * @method uploadHomework
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
function uploadHomework(req, res) {
    if (!req.session.signIn)
        return res.sendStatus(401);
    var hash = crypto.createHash('sha512');
    var file = req.files.attachment;
    var hashedName = hash.update(file.data).digest('hex');
    var attachmentId = req.params.attachId;
    dbClient.query('INSERT INTO homework_log(student_id, attachment_id, email, file_name) VALUES (?,?,?,?);', [req.session.studentId, attachmentId, req.session.email, hashedName], function (err, insertResult) {
        if (err) {
            app_1.logger.error('[rest_api::uploadHomework::insert] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
            res.sendStatus(500);
            return;
        }
        app_1.logger.debug('[uploadHomework:insert into homework_log]');
        app_1.logger.debug(util.inspect(insertResult, { showHidden: false, depth: 1 }));
        file.mv(path.join(app_1.submittedHomeworkPath, hashedName), function (err) {
            if (err) {
                app_1.logger.error('[rest_api::uploadHomework::file_move] : ');
                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                res.sendStatus(500);
                return;
            }
        });
        res.sendStatus(202);
    });
}
exports.uploadHomework = uploadHomework;
/**
 * Check uploaded name is already exist.
 *
 * @method checkHomeworkName
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
function checkHomeworkName(req, res) {
    if (!req.session.admin)
        return res.sendStatus(401);
    dbClient.query('SELECT * FROM homework WHERE name = ?;', encodeURIComponent(req.query.name), function (err, searchResult) {
        if (err) {
            app_1.logger.error('[rest_api::checkHomeworkName::select] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
            res.sendStatus(500);
            return;
        }
        res.sendStatus(searchResult.length == 0 ? 200 : 409);
    });
}
exports.checkHomeworkName = checkHomeworkName;
/**
 * Send homework file.
 *
 * @method downloadSubmittedHomework
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
function downloadSubmittedHomework(req, res) {
    if (!req.session.signIn)
        return res.sendStatus(401);
    dbClient.query('SELECT student_id AS `studentId`, file_name AS `fileName`, name ' +
        'FROM homework_log JOIN homework_config ON homework_log.attachment_id = homework_config.id ' +
        'WHERE homework_log.id=?', req.params.logId, function (err, result) {
        if (err) {
            app_1.logger.error('[rest_api::downloadSubmittedHomework::search] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
            res.sendStatus(500);
            return;
        }
        var row = result[0];
        if (req.session.admin || row.studentId == req.session.studentId) {
            res.download(path.join(app_1.submittedHomeworkPath, row.fileName), row.name);
        }
        else {
            app_1.logger.error('[rest_api::downloadSubmittedHomework::student_id-mismatch]');
            res.sendStatus(401);
        }
    });
}
exports.downloadSubmittedHomework = downloadSubmittedHomework;
