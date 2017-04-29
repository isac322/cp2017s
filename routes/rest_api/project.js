"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var crypto = require("crypto");
var mysql_1 = require("mysql");
var util = require("util");
var app_1 = require("../../app");
var path = require("path");
var dbConfig = JSON.parse(fs.readFileSync('config/database.json', 'utf-8'));
var dbClient = mysql_1.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database
});
/**
 * creating a new project request api.
 *
 * @method createProject
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
function createProject(req, res) {
    if (!req.session.admin)
        return res.sendStatus(401);
    var name = encodeURIComponent(req.body.name);
    var start_date = req.body.start;
    var end_date = req.body.due;
    var description = req.body.description;
    dbClient.query('INSERT INTO project(name, start_date, end_date, author_id, author_email, description) VALUES(?,?,?,?,?,?);', [name, start_date, end_date, req.session.studentId, req.session.email, description], function (err, insertResult) {
        if (err) {
            app_1.logger.error('[rest_api::createProject::outer_insert] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
            res.sendStatus(500);
            return;
        }
        app_1.logger.debug('[createProject:insert into project]');
        app_1.logger.debug(util.inspect(insertResult, { showHidden: false, depth: 1 }));
        var projectId = insertResult.insertId;
        var values = [];
        for (var _i = 0, _a = req.body.attachment; _i < _a.length; _i++) {
            var attachment = _a[_i];
            var fileName = encodeURIComponent(attachment.name);
            var extension = attachment.extension;
            values.push([projectId, fileName, extension]);
        }
        dbClient.query('INSERT INTO project_config(project_id, name, extension) VALUES ' + mysql_1.escape(values) + ';', function (err, result) {
            if (err) {
                app_1.logger.error('[rest_api::createProject::inner_insert] : ');
                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                res.sendStatus(500);
                return;
            }
            app_1.logger.debug('[createProject:insert into project_config]');
            app_1.logger.debug(util.inspect(result, { showHidden: false, depth: 1 }));
        });
        res.redirect('/project');
    });
}
exports.createProject = createProject;
/**
 * The attachment upload request api.
 *
 * @method uploadProject
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
function uploadProject(req, res) {
    if (!req.session.signIn)
        return res.sendStatus(401);
    var hash = crypto.createHash('sha512');
    var file = req.files.attachment;
    var hashedName = hash.update(file.data).digest('hex');
    var attachmentId = req.params.attachId;
    dbClient.query('INSERT INTO project_log(student_id, attachment_id, email, file_name) VALUES (?,?,?,?);', [req.session.studentId, attachmentId, req.session.email, hashedName], function (err, insertResult) {
        if (err) {
            app_1.logger.error('[rest_api::uploadProject::insert] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
            res.sendStatus(500);
            return;
        }
        app_1.logger.debug('[uploadProject:insert into project_log]');
        app_1.logger.debug(util.inspect(insertResult, { showHidden: false, depth: 1 }));
        file.mv(path.join(app_1.submittedProjectPath, hashedName), function (err) {
            if (err) {
                app_1.logger.error('[rest_api::uploadProject::file_move] : ');
                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                res.sendStatus(500);
                return;
            }
        });
        res.sendStatus(202);
    });
}
exports.uploadProject = uploadProject;
/**
 * Check uploaded name is already exist.
 *
 * @method pjNameChecker
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
function pjNameChecker(req, res) {
    if (!req.session.admin)
        return res.sendStatus(401);
    dbClient.query('SELECT * FROM project WHERE name = ?;', encodeURIComponent(req.query.name), function (err, searchResult) {
        if (err) {
            app_1.logger.error('[rest_api::pjNameChecker::select] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
            res.sendStatus(500);
            return;
        }
        res.sendStatus(searchResult.length == 0 ? 200 : 409);
    });
}
exports.pjNameChecker = pjNameChecker;
