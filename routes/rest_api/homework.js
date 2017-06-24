"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const fs = require("fs");
const util = require("util");
const app_1 = require("../../app");
const mysql_1 = require("mysql");
const path = require("path");
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
    dbClient.query('INSERT INTO homework(name, start_date, end_date, author_id, author_email, description) VALUES(?,?,?,?,?,?);', [name, start_date, end_date, req.session.studentId, req.session.email, description], (err, insertResult) => {
        if (err) {
            app_1.logger.error('[rest_api::createHomework::outer_insert] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false }));
            res.sendStatus(500);
            return;
        }
        app_1.logger.debug('[rest_api::createHomework:insert into homework]');
        app_1.logger.debug(util.inspect(insertResult, { showHidden: false, depth: 1 }));
        const homeworkId = insertResult.insertId;
        const values = [];
        for (let attachment of req.body.attachment) {
            const fileName = encodeURIComponent(attachment.name);
            const extension = attachment.extension;
            values.push([homeworkId, fileName, extension]);
        }
        dbClient.query('INSERT INTO homework_config(homework_id, name, extension) VALUES ' + mysql_1.escape(values) + ';', (err, result) => {
            if (err) {
                app_1.logger.error('[rest_api::createHomework::inner_insert] : ');
                app_1.logger.error(util.inspect(err, { showHidden: false }));
                res.sendStatus(500);
                return;
            }
            app_1.logger.debug('[rest_api::createHomework:insert into homework_config]');
            app_1.logger.debug(util.inspect(result, { showHidden: false, depth: 1 }));
        });
        res.redirect('/homework');
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
    dbClient.query('INSERT INTO homework_log(student_id, attachment_id, email, file_name) VALUES (?,?,?,?);', [req.session.studentId, attachmentId, req.session.email, hashedName], (err, insertResult) => {
        if (err) {
            app_1.logger.error('[rest_api::uploadHomework::insert] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false }));
            res.sendStatus(500);
            return;
        }
        app_1.logger.debug('[uploadHomework:insert into homework_log]');
        app_1.logger.debug(util.inspect(insertResult, { showHidden: false, depth: 1 }));
        file.mv(path.join(app_1.submittedHomeworkPath, hashedName), (err) => {
            if (err) {
                app_1.logger.error('[rest_api::uploadHomework::file_move] : ');
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
    dbClient.query('SELECT * FROM homework WHERE name = ?;', encodeURIComponent(req.query.name), (err, searchResult) => {
        if (err) {
            app_1.logger.error('[rest_api::checkHomeworkName::select] : ');
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
        'FROM homework_log JOIN homework_config ON homework_log.attachment_id = homework_config.id ' +
        'WHERE homework_log.id = ?', req.params.logId, (err, result) => {
        if (err) {
            app_1.logger.error('[rest_api::downloadSubmittedHomework::search] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false }));
            res.sendStatus(500);
            return;
        }
        const row = result[0];
        if (req.session.admin || row.studentId == req.session.studentId) {
            res.download(path.join(app_1.submittedHomeworkPath, row.fileName), row.name);
        }
        else {
            app_1.logger.error('[rest_api::downloadSubmittedHomework::student_id-mismatch]');
            res.sendStatus(401);
        }
    });
}
exports.downloadSingle = downloadSingle;
function downloadAll(req, res) {
    if (!req.session.admin)
        return res.sendStatus(401);
    dbClient.query('SELECT student_id, file_name, name ' +
        'FROM homework_config JOIN homework_board ON homework_config.id = homework_board.attachment_id ' +
        `WHERE homework_id = ${req.params.homeworkId}` +
        ('studentId' in req.query ?
            ` student_id = ${req.query.studentId};` :
            ''), (err, result) => {
        if (err) {
            app_1.logger.error('[rest_api::downloadAll::search] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false }));
            res.sendStatus(500);
            return;
        }
        const entries = result.reduce((prev, cur) => {
            if (!(cur.student_id in prev))
                prev[cur.student_id] = {};
            prev[cur.student_id][cur.name] = fs.createReadStream(path.join(app_1.submittedHomeworkPath, cur.file_name));
            return prev;
        }, {});
        zip_1.sendZip(res, entries);
    });
}
exports.downloadAll = downloadAll;
