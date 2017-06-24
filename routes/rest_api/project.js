"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("async");
const crypto = require("crypto");
const fs = require("fs");
const mysql_1 = require("mysql");
const path = require("path");
const util = require("util");
const app_1 = require("../../app");
const zip_1 = require("./zip");
const dbConfig = JSON.parse(fs.readFileSync('config/database.json', 'utf-8'));
const dbClient = mysql_1.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database
});
function create(req, res) {
    if (!req.session.admin)
        return res.sendStatus(401);
    const name = encodeURIComponent(req.body.name);
    const start_date = req.body.start;
    const end_date = req.body.due;
    const description = req.body.description;
    dbClient.query('INSERT INTO project(name, start_date, end_date, author_id, author_email, description) VALUES(?,?,?,?,?,?);', [name, start_date, end_date, req.session.studentId, req.session.email, description], (err, insertResult) => {
        if (err) {
            app_1.logger.error('[rest_api::createProject::outer_insert] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false }));
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
                app_1.logger.error(util.inspect(err, { showHidden: false }));
                res.sendStatus(500);
                return;
            }
            app_1.logger.debug('[createProject:insert into project_config]');
            app_1.logger.debug(util.inspect(result, { showHidden: false, depth: 1 }));
        });
        res.redirect('/project');
    });
}
exports.create = create;
function upload(req, res) {
    if (!req.session.signIn)
        return res.sendStatus(401);
    const hash = crypto.createHash('sha512');
    const file = req.files.attachment;
    const hashedName = hash.update(file.data).digest('hex');
    const attachmentId = req.params.attachId;
    dbClient.query('INSERT INTO project_log(student_id, attachment_id, email, file_name) VALUES (?,?,?,?);', [req.session.studentId, attachmentId, req.session.email, hashedName], (err, insertResult) => {
        if (err) {
            app_1.logger.error('[rest_api::uploadProject::insert] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false }));
            res.sendStatus(500);
            return;
        }
        app_1.logger.debug('[uploadProject:insert into project_log]');
        app_1.logger.debug(util.inspect(insertResult, { showHidden: false, depth: 1 }));
        file.mv(path.join(app_1.submittedProjectPath, hashedName), (err) => {
            if (err) {
                app_1.logger.error('[rest_api::uploadProject::file_move] : ');
                app_1.logger.error(util.inspect(err, { showHidden: false }));
                res.sendStatus(500);
                return;
            }
        });
        res.sendStatus(202);
    });
}
exports.upload = upload;
function checkName(req, res) {
    if (!req.session.admin)
        return res.sendStatus(401);
    dbClient.query('SELECT * FROM project WHERE name = ?;', encodeURIComponent(req.query.name), (err, searchResult) => {
        if (err) {
            app_1.logger.error('[rest_api::checkProjectName::select] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false }));
            res.sendStatus(500);
            return;
        }
        res.sendStatus(searchResult.length == 0 ? 200 : 409);
    });
}
exports.checkName = checkName;
function downloadSingle(req, res) {
    if (!req.session.signIn)
        return res.sendStatus(401);
    dbClient.query('SELECT student_id AS `studentId`, file_name AS `fileName`, name ' +
        'FROM project_log JOIN project_config ON project_log.attachment_id = project_config.id ' +
        'WHERE project_log.id = ?', req.params.logId, (err, result) => {
        if (err) {
            app_1.logger.error('[rest_api::downloadSubmittedProject::search] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false }));
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
exports.downloadSingle = downloadSingle;
function downloadAll(req, res) {
    if (!req.session.admin)
        return res.sendStatus(401);
    async.parallel([
        (callback) => dbClient.query(`SELECT name FROM project WHERE id = ${req.params.projectId}`, callback),
        (callback) => dbClient.query('SELECT student_id, file_name, name ' +
            'FROM project_config JOIN project_board ON project_config.id = project_board.attachment_id ' +
            `WHERE project_id = ${req.params.projectId}` +
            ('studentId' in req.query ? ` AND student_id = \'${req.query.studentId}\';` : ''), callback)
    ], (err, result) => {
        if (err) {
            app_1.logger.error('[rest_api::downloadAll::search] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false }));
            res.sendStatus(500);
            return;
        }
        const entries = result[1][0].reduce((prev, cur) => {
            if (!(cur.student_id in prev))
                prev[cur.student_id] = {};
            prev[cur.student_id][cur.name] = fs.createReadStream(path.join(app_1.submittedProjectPath, cur.file_name));
            return prev;
        }, {});
        if (Object.keys(entries).length == 1)
            zip_1.sendSingleZip(res, entries, result[1][0][0].student_id);
        else
            zip_1.sendZip(res, entries, result[0][0][0].name);
    });
}
exports.downloadAll = downloadAll;
