"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("async");
const crypto = require("crypto");
const fs = require("fs");
const fs_ext = require("fs-extra");
const iconv = require("iconv-lite");
const mysql_1 = require("mysql");
const path = require("path");
const util = require("util");
const app_1 = require("../../app");
const judge_1 = require("./judge");
const charsetDetector = require('detect-character-encoding');
const dbConfig = JSON.parse(fs.readFileSync('config/database.json', 'utf-8'));
const dbClient = mysql_1.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database
});
function upload(req, res) {
    if (!req.session.signIn)
        return res.sendStatus(401);
    const hash = crypto.createHash('sha512');
    const file = req.files.attachment;
    const attachId = req.params.attachId;
    const studentId = req.session.studentId;
    const encodingInfo = charsetDetector(file.data);
    app_1.logger.debug(util.inspect(encodingInfo, { showHidden: false, depth: 1 }));
    let hashedOriginal = crypto.createHash('sha512').update(file.data).digest('hex');
    let fileContent;
    if (encodingInfo.encoding == 'UTF-8') {
        fileContent = iconv.decode(file.data, encodingInfo.encoding);
    }
    else {
        fileContent = iconv.decode(file.data, 'EUC-KR');
    }
    const hashedName = hash.update(fileContent).digest('hex');
    if (hashedName == hashedOriginal) {
        hashedOriginal = undefined;
    }
    else {
        fs.writeFile(path.join(app_1.submittedExerciseOriginalPath, hashedOriginal), file.data, { mode: 0o600 }, (err) => {
            if (err) {
                app_1.logger.error('[rest_api::uploadExercise::writeOriginalFile] : ');
                app_1.logger.error(util.inspect(err, { showHidden: false }));
            }
        });
    }
    fs.writeFile(path.join(app_1.submittedExercisePath, hashedName), fileContent, { mode: 0o600 }, (err) => {
        if (err) {
            app_1.logger.error('[rest_api::uploadExercise::writeFile] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false }));
        }
    });
    dbClient.query('SELECT name, extension, test_set_size, input_through_arg FROM exercise_config WHERE id = ?;', attachId, (err, searchResult) => {
        if (err) {
            app_1.logger.error('[rest_api::uploadExercise::select] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false }));
            res.sendStatus(500);
            return;
        }
        const sourcePath = fs.mkdtempSync(path.join(app_1.tempPath, studentId + '_'));
        const outputPath = fs.mkdtempSync(path.join(app_1.tempPath, studentId + '_'));
        fs.writeFile(path.join(sourcePath, 'config.json'), JSON.stringify({
            sourceName: searchResult[0].name,
            extension: searchResult[0].extension,
            testSetSize: searchResult[0].test_set_size,
            inputThroughArg: searchResult[0].input_through_arg
        }), { mode: 0o400 });
        fs.writeFileSync(path.join(sourcePath, searchResult[0].name), fileContent, { mode: 0o600 });
        dbClient.query('INSERT INTO exercise_log (student_id, attachment_id, email, file_name, original_file) VALUE (?, ?, ?, ?, ?);', [studentId, attachId, req.session.email, hashedName, hashedOriginal], (err, insertResult) => {
            if (err) {
                app_1.logger.error('[rest_api::uploadExercise::insert] : ');
                app_1.logger.error(util.inspect(err, { showHidden: false }));
                res.sendStatus(500);
                return;
            }
            app_1.logger.debug('[uploadExercise:insert into exercise_log]');
            app_1.logger.debug(util.inspect(insertResult, { showHidden: false, depth: 1 }));
            const inputPath = path.join(app_1.exerciseSetPath, attachId.toString(), 'input');
            const answerPath = path.join(app_1.exerciseSetPath, attachId.toString(), 'output');
            judge_1.runJudge(outputPath, sourcePath, inputPath, answerPath, (err, code, result) => {
                async.parallel([
                    () => sendResult(res, code, result, inputPath, answerPath, insertResult.insertId),
                    () => storeResult(code, result, insertResult.insertId)
                ]);
            });
        });
    });
}
exports.upload = upload;
function sendResult(res, code, result, inputPath, answerPath, logId) {
    switch (code) {
        case 6:
            res.status(500).json({ id: logId });
            break;
        case 5:
            res.status(417).json({ errorMsg: result.errorStr });
            break;
        case 2:
            res.status(400).json({ errorMsg: result.errorStr });
            break;
        case 1:
            let tasks = [
                (callback) => {
                    fs.readFile(path.join(answerPath, result.inputIndex + '.out'), 'UTF-8', callback);
                },
                (callback) => {
                    fs.readFile(path.join(inputPath, result.inputIndex + '.in'), 'UTF-8', callback);
                }
            ];
            async.parallel(tasks, (err, data) => {
                if (err) {
                    app_1.logger.error('[rest_api::sendResult::incorrect::read_file] : ');
                    app_1.logger.error(util.inspect(err, { showHidden: false }));
                    res.status(500).json({ id: logId });
                }
                else {
                    res.status(406).json({
                        userOutput: result.userOutput,
                        answerOutput: data[0],
                        input: data[1]
                    });
                }
            });
            break;
        case 4:
            fs.readFile(path.join(inputPath, result.inputIndex + '.in'), 'UTF-8', (err, data) => {
                if (err) {
                    app_1.logger.error('[rest_api::uploadExercise::read_file:runtimeError] : ');
                    app_1.logger.error(util.inspect(err, { showHidden: false }));
                    res.status(500).json({ id: logId });
                }
                else {
                    res.status(412).json({
                        input: data,
                        errorLog: result.errorLog,
                        returnCode: result.returnCode
                    });
                }
            });
            break;
        case 3:
            fs.readFile(path.join(inputPath, result.inputIndex + '.in'), 'UTF-8', (err, data) => {
                if (err) {
                    app_1.logger.error('[rest_api::uploadExercise::read_file:timeout] : ');
                    app_1.logger.error(util.inspect(err, { showHidden: false }));
                    res.status(500).json({ id: logId });
                }
                else
                    res.status(410).json({ input: data });
            });
            break;
        case 0:
            res.sendStatus(200);
            break;
    }
}
function storeResult(code, result, logId) {
    switch (code) {
        case 2:
            dbClient.query('INSERT INTO exercise_result(log_id, type, compile_error) VALUE(?,?,?);', [logId, code, result.errorStr], (err) => {
                if (err) {
                    app_1.logger.error('[rest_api::handleResult::insert_compile_error] : ');
                    app_1.logger.error(util.inspect(err, { showHidden: false }));
                }
            });
            break;
        case 0:
            dbClient.query('INSERT INTO exercise_result (log_id, type, runtime_error) VALUE (?, ?, ?);', [logId, code, result.errorLog], (err) => {
                if (err) {
                    app_1.logger.error('[rest_api::handleResult::insert_judge_correct] : ');
                    app_1.logger.error(util.inspect(err, { showHidden: false }));
                }
            });
            if (result.errorLog) {
                app_1.logger.error('[rest_api::handleResult::insert_judge_correct-found_error] ' + logId);
            }
            break;
        case 3:
            dbClient.query('INSERT INTO exercise_result (log_id, type, return_code, failed_index) VALUE (?, ?, ?, ?);', [logId, code, result.returnCode, result.inputIndex], (err) => {
                if (err) {
                    app_1.logger.error('[rest_api::handleResult::insert_judge_timeout] : ');
                    app_1.logger.error(util.inspect(err, { showHidden: false }));
                }
            });
            break;
        case 4:
            dbClient.query('INSERT INTO exercise_result (log_id, type, return_code, runtime_error, failed_index) VALUE (?, ?, ?, ?, ?);', [logId, code, result.returnCode, result.errorLog, result.inputIndex], (err) => {
                if (err) {
                    app_1.logger.error('[rest_api::handleResult::insert_judge_runtime_error] : ');
                    app_1.logger.error(util.inspect(err, { showHidden: false }));
                }
            });
            break;
        case 1:
            dbClient.query('INSERT INTO exercise_result (log_id, type, failed_index, user_output, runtime_error) VALUE (?, ?, ?, ?, ?);', [logId, code, result.inputIndex, result.userOutput, result.errorLog], (err) => {
                if (err) {
                    app_1.logger.error('[rest_api::handleResult::insert_judge_incorrect] : ');
                    app_1.logger.error(util.inspect(err, { showHidden: false }));
                }
            });
            break;
        case 5:
            dbClient.query('INSERT INTO exercise_result(log_id, type, script_error) VALUE(?, ?, ?);', [logId, code, result.errorStr], (err) => {
                if (err) {
                    app_1.logger.error('[rest_api::handleResult::insert_script_error] : ');
                    app_1.logger.error(util.inspect(err, { showHidden: false }));
                }
            });
            break;
    }
}
function resolveUnhandled(req, res) {
    if (!req.session.admin)
        return res.sendStatus(401);
    dbClient.query('SELECT exercise_log.id, exercise_log.attachment_id AS `attachId`, exercise_log.student_id AS `studentId`, file_name AS `fileName` ' +
        'FROM exercise_log ' +
        '    LEFT JOIN exercise_result ON exercise_result.log_id = exercise_log.id ' +
        'WHERE exercise_result.id IS NULL;', (err, searchList) => {
        if (err) {
            app_1.logger.error('[rest_api::resolveUnhandled::search] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false }));
            res.sendStatus(500);
            return;
        }
        for (const log of searchList) {
            dbClient.query('SELECT name, extension, test_set_size, input_through_arg FROM exercise_config WHERE id = ?;', log.attachId, (err, exerciseSetting) => {
                if (err) {
                    app_1.logger.error('[rest_api::resolveUnhandled::select] : ');
                    app_1.logger.error(util.inspect(err, { showHidden: false, depth: 1 }));
                    res.sendStatus(500);
                    return;
                }
                const sourcePath = fs.mkdtempSync(path.join(app_1.tempPath, log.studentId + '_'));
                const outputPath = fs.mkdtempSync(path.join(app_1.tempPath, log.studentId + '_'));
                fs.writeFile(path.join(sourcePath, 'config.json'), JSON.stringify({
                    sourceName: exerciseSetting[0].name,
                    extension: exerciseSetting[0].extension,
                    testSetSize: exerciseSetting[0].test_set_size,
                    inputThroughArg: exerciseSetting[0].input_through_arg
                }), { mode: 0o400 });
                fs_ext.copySync(path.join(app_1.submittedExercisePath, log.fileName), path.join(sourcePath, exerciseSetting[0].name));
                const inputPath = path.join(app_1.exerciseSetPath, log.attachId.toString(), 'input');
                const answerPath = path.join(app_1.exerciseSetPath, log.attachId.toString(), 'output');
                judge_1.runJudge(outputPath, sourcePath, inputPath, answerPath, (err, code, result) => {
                    storeResult(code, result, log.id);
                });
            });
        }
    });
    return res.sendStatus(200);
}
exports.resolveUnhandled = resolveUnhandled;
function fetchJudgeResult(req, res) {
    if (!req.session.signIn)
        return 401;
    dbClient.query('SELECT student_id, attachment_id, type, compile_error, failed_index, user_output, return_code, runtime_error, script_error ' +
        'FROM exercise_log JOIN exercise_result ON exercise_log.id = exercise_result.log_id ' +
        'WHERE log_id = ?', req.params.logId, (err, searchResult) => {
        if (err) {
            app_1.logger.error('[rest_api::fetchJudgeResult::search] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false }));
            res.sendStatus(500);
            return;
        }
        const result = searchResult[0];
        if (!req.session.admin && req.session.studentId != result.student_id) {
            res.sendStatus(401);
            return;
        }
        const testSetPath = path.join(app_1.exerciseSetPath, result.attachment_id.toString());
        switch (result.type) {
            case 0:
                res.sendStatus(200);
                break;
            case 1:
                let tasks = [
                    (callback) => {
                        fs.readFile(path.join(testSetPath, 'input', result.failed_index + '.in'), 'UTF-8', callback);
                    },
                    (callback) => {
                        fs.readFile(path.join(testSetPath, 'output', result.failed_index + '.out'), 'UTF-8', callback);
                    }
                ];
                async.parallel(tasks, (err, data) => {
                    if (err) {
                        app_1.logger.error('[rest_api::handleResult::fetchJudgeResult::incorrect::read_file] : ');
                        app_1.logger.error(util.inspect(err, { showHidden: false }));
                        res.sendStatus(500);
                        return;
                    }
                    res.status(406).json({
                        userOutput: result.user_output,
                        answerOutput: data[1],
                        input: data[0]
                    });
                });
                break;
            case 2:
                res.status(400).json({ errorMsg: result.compile_error });
                break;
            case 3:
                fs.readFile(path.join(testSetPath, 'input', result.failed_index + '.in'), 'UTF-8', (err, data) => {
                    if (err) {
                        app_1.logger.error('[rest_api::handleResult::fetchJudgeResult::timeout::read_file] : ');
                        app_1.logger.error(util.inspect(err, { showHidden: false }));
                        res.sendStatus(500);
                        return;
                    }
                    res.status(410).json({ input: data });
                });
                break;
            case 4:
                fs.readFile(path.join(testSetPath, 'input', result.failed_index + '.in'), 'UTF-8', (err, data) => {
                    if (err) {
                        app_1.logger.error('[rest_api::handleResult::fetchJudgeResult::runtimeError::read_file] : ');
                        app_1.logger.error(util.inspect(err, { showHidden: false }));
                        res.sendStatus(500);
                        return;
                    }
                    res.status(412).json({
                        input: data,
                        errorLog: result.runtime_error,
                        returnCode: result.return_code
                    });
                });
                break;
            case 5:
                res.status(417).json({ errorMsg: result.script_error });
                break;
        }
    });
}
exports.fetchJudgeResult = fetchJudgeResult;
function downloadSingle(req, res) {
    if (!req.session.signIn)
        return res.sendStatus(401);
    dbClient.query('SELECT student_id AS `studentId`, file_name AS `fileName`, original_file AS `originalFile`, name ' +
        'FROM exercise_log JOIN exercise_config ON exercise_log.attachment_id = exercise_config.id ' +
        'WHERE exercise_log.id = ?', req.params.logId, (err, result) => {
        if (err) {
            app_1.logger.error('[rest_api::downloadSubmittedExercise::search] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false }));
            res.sendStatus(500);
            return;
        }
        const row = result[0];
        if (req.session.admin || row.studentId == req.session.studentId) {
            if (!('encoded' in req.query) && row.originalFile) {
                res.download(path.join(app_1.submittedExerciseOriginalPath, row.originalFile), row.name);
            }
            else {
                res.download(path.join(app_1.submittedExercisePath, row.fileName), row.name);
            }
        }
        else {
            app_1.logger.error('[rest_api::downloadSubmittedExercise::student_id-mismatch]');
            res.sendStatus(401);
        }
    });
}
exports.downloadSingle = downloadSingle;
