"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const crypto = require("crypto");
const mysql_1 = require("mysql");
const util = require("util");
const app_1 = require("../../app");
const path = require("path");
const dbConfig = JSON.parse(fs.readFileSync('config/database.json', 'utf-8'));
const dbClient = mysql_1.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database
});
function createProject(req, res) {
    if (!req.session.admin)
        return res.sendStatus(401);
    const name = encodeURIComponent(req.body.name);
    const start_date = req.body.start;
    const end_date = req.body.due;
    const description = req.body.description;
    dbClient.query('INSERT INTO project(name, start_date, end_date, author_id, author_email, description) VALUES(?,?,?,?,?,?);', [name, start_date, end_date, req.session.studentId, req.session.email, description], (err, insertResult) => {
        if (err) {
            app_1.logger.error('[rest_api::createProject::outer_insert] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false, depth: undefined }));
            res.sendStatus(500);
            return;
        }
        app_1.logger.debug('[createProject:insert into project]');
        app_1.logger.debug(util.inspect(insertResult, { showHidden: false, depth: 1 }));
        const projectId = insertResult.insertId;
        const values = [];
        for (let attachment of req.body.attachment) {
            const fileName = encodeURIComponent(attachment.name);
            const extension = attachment.extension;
            values.push([projectId, fileName, extension]);
        }
        dbClient.query('INSERT INTO project_config(project_id, name, extension) VALUES ' + mysql_1.escape(values) + ';', (err, result) => {
            if (err) {
                app_1.logger.error('[rest_api::createProject::inner_insert] : ');
                app_1.logger.error(util.inspect(err, { showHidden: false, depth: undefined }));
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
function uploadProject(req, res) {
    if (!req.session.signIn)
        return res.sendStatus(401);
    const hash = crypto.createHash('sha512');
    const file = req.files.attachment;
    const hashedName = hash.update(file.data).digest('hex');
    const attachmentId = req.params.attachId;
    dbClient.query('INSERT INTO project_log(student_id, attachment_id, email, file_name) VALUES (?,?,?,?);', [req.session.studentId, attachmentId, req.session.email, hashedName], (err, insertResult) => {
        if (err) {
            app_1.logger.error('[rest_api::uploadProject::insert] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false, depth: undefined }));
            res.sendStatus(500);
            return;
        }
        app_1.logger.debug('[uploadProject:insert into project_log]');
        app_1.logger.debug(util.inspect(insertResult, { showHidden: false, depth: 1 }));
        file.mv(path.join(app_1.submittedProjectPath, hashedName), (err) => {
            if (err) {
                app_1.logger.error('[rest_api::uploadProject::file_move] : ');
                app_1.logger.error(util.inspect(err, { showHidden: false, depth: undefined }));
                res.sendStatus(500);
                return;
            }
        });
        res.sendStatus(202);
    });
}
exports.uploadProject = uploadProject;
function checkProjectName(req, res) {
    if (!req.session.admin)
        return res.sendStatus(401);
    dbClient.query('SELECT * FROM project WHERE name = ?;', encodeURIComponent(req.query.name), (err, searchResult) => {
        if (err) {
            app_1.logger.error('[rest_api::checkProjectName::select] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false, depth: undefined }));
            res.sendStatus(500);
            return;
        }
        res.sendStatus(searchResult.length == 0 ? 200 : 409);
    });
}
exports.checkProjectName = checkProjectName;
function downloadSubmittedProject(req, res) {
    if (!req.session.signIn)
        return res.sendStatus(401);
    dbClient.query('SELECT student_id AS `studentId`, file_name AS `fileName`, name ' +
        'FROM project_log JOIN project_config ON project_log.attachment_id = project_config.id ' +
        'WHERE project_log.id = ?', req.params.logId, (err, result) => {
        if (err) {
            app_1.logger.error('[rest_api::downloadSubmittedProject::search] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false, depth: undefined }));
            res.sendStatus(500);
            return;
        }
        const row = result[0];
        if (req.session.admin || row.studentId == req.session.studentId) {
            res.download(path.join(app_1.submittedProjectPath, row.fileName), row.name);
        }
        else {
            app_1.logger.error('[rest_api::downloadSubmittedProject::student_id-mismatch]');
            res.sendStatus(401);
        }
    });
}
exports.downloadSubmittedProject = downloadSubmittedProject;
//# sourceMappingURL=project.js.map