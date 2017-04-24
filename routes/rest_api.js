"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var crypto = require("crypto");
var fs = require("fs");
var fs_ext = require("fs-extra");
var iconv = require("iconv-lite");
var mysql_1 = require("mysql");
var path = require("path");
var app_1 = require("../app");
var util = require("util");
var async = require("async");
var charsetDetector = require("detect-character-encoding");
var webConfig = JSON.parse(fs.readFileSync('config/web.json', 'utf-8'));
var CLIENT_ID = webConfig.google.clientId;
var GoogleAuth = require('google-auth-library');
var auth = new GoogleAuth;
var OAuth2Client = new auth.OAuth2(CLIENT_ID, '', '');
var dbConfig = JSON.parse(fs.readFileSync('config/database.json', 'utf-8'));
exports.dbClient = mysql_1.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database
});
/**
 * The sign in request api.
 *
 * @method signIn
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
function signIn(req, res) {
    if (req.session.signIn) {
        return res.sendStatus(401);
    }
    var token = req.body.idtoken;
    OAuth2Client.verifyIdToken(token, CLIENT_ID, function (e, login) {
        if (e) {
            // FIXME: error handling
            throw e;
        }
        var payload = login.getPayload();
        var email = payload['email'];
        exports.dbClient.query('SELECT * from email, user where email = "' + email + '" and user.student_id = email.student_id;', function (err, result) {
            if (err) {
                app_1.logger.error('[rest_api::signIn::select] : ');
                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                res.sendStatus(500);
                return;
            }
            app_1.logger.debug('[signIn]');
            app_1.logger.debug(util.inspect(result, { showHidden: false, depth: 1 }));
            switch (result.length) {
                case 0:
                    res.sendStatus(204);
                    break;
                case 1:
                    req.session.admin = result[0].is_admin == '1';
                    req.session.email = email;
                    req.session.name = decodeURIComponent(result[0].name);
                    req.session.signIn = true;
                    req.session.studentId = result[0].student_id;
                    res.sendStatus(202);
                    break;
                default:
                    res.sendStatus(500);
            }
        });
    });
}
exports.signIn = signIn;
function signOut(req, res) {
    if (!req.session.signIn)
        return res.sendStatus(401);
    req.session.admin = false;
    req.session.email = null;
    req.session.name = null;
    req.session.signIn = false;
    req.session.studentId = null;
    return res.sendStatus(202);
}
exports.signOut = signOut;
/**
 * The register request api.
 *
 * @method register
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
function register(req, res) {
    if (req.session.signIn)
        return res.sendStatus(401);
    var body = req.body;
    var studentId = body.student_id1 + '-' + body.student_id2;
    var name = encodeURIComponent(body.name);
    var idToken = body.id_token;
    OAuth2Client.verifyIdToken(idToken, CLIENT_ID, function (e, login) {
        if (e) {
            // FIXME: error handling
            throw e;
        }
        var payload = login.getPayload();
        var email = payload['email'];
        var nameInGoogle = encodeURIComponent(payload['name']);
        exports.dbClient.query('SELECT * FROM user WHERE student_id = \'' + studentId + '\';', function (err, selectResult) {
            if (err || selectResult.length > 1) {
                app_1.logger.error('[rest_api::register::select] : ');
                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                res.sendStatus(500);
                return;
            }
            else if (selectResult.length == 0) {
                res.sendStatus(204);
                return;
            }
            app_1.logger.debug('[register:outer]');
            app_1.logger.debug(util.inspect(selectResult, { showHidden: false, depth: 1 }));
            exports.dbClient.query('INSERT INTO email VALUES (?,?,?);', [studentId, email, nameInGoogle], function (err, insertResult) {
                if (err) {
                    app_1.logger.error('[rest_api::register::insert] : ');
                    app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                    res.sendStatus(500);
                    return;
                }
                app_1.logger.debug('[register:inner]');
                app_1.logger.debug(util.inspect(insertResult, { showHidden: false, depth: 1 }));
                req.session.admin = selectResult[0].is_admin == '1';
                req.session.email = email;
                req.session.name = decodeURIComponent(selectResult[0].name);
                req.session.signIn = true;
                req.session.studentId = selectResult[0].student_id;
                res.sendStatus(201);
            });
        });
    });
}
exports.register = register;
/**
 * creating a new homework request api.
 *
 * @method createHW
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
function createHW(req, res) {
    if (!req.session.admin)
        return res.sendStatus(401);
    var name = encodeURIComponent(req.body.name);
    var start_date = req.body.start;
    var end_date = req.body.due;
    var description = req.body.description;
    exports.dbClient.query('INSERT INTO homework(name, start_date, end_date, author_id, author_email, description) VALUES(?,?,?,?,?,?);', [name, start_date, end_date, req.session.studentId, req.session.email, description], function (err, insertResult) {
        if (err) {
            app_1.logger.error('[rest_api::createHW::outer_insert] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
            res.sendStatus(500);
            return;
        }
        app_1.logger.debug('[createHW:insert into homework]');
        app_1.logger.debug(util.inspect(insertResult, { showHidden: false, depth: 1 }));
        var homeworkId = insertResult.insertId;
        var values = [];
        for (var _i = 0, _a = req.body.attachment; _i < _a.length; _i++) {
            var attachment = _a[_i];
            var hwName = encodeURIComponent(attachment.name);
            var extension = attachment.extension;
            values.push([homeworkId, hwName, extension]);
        }
        exports.dbClient.query('INSERT INTO hw_config(homework_id, name, extension) VALUES ' + mysql_1.escape(values) + ';', function (err, result) {
            if (err) {
                app_1.logger.error('[rest_api::createHW::inner_insert] : ');
                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                res.sendStatus(500);
                return;
            }
            app_1.logger.debug('[createHW:insert into hw_config]');
            app_1.logger.debug(util.inspect(result, { showHidden: false, depth: 1 }));
        });
        res.redirect('/homework');
    });
}
exports.createHW = createHW;
/**
 * The attachment upload request api.
 *
 * @method uploadAttach
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
function uploadAttach(req, res) {
    if (!req.session.signIn)
        return res.sendStatus(401);
    var hash = crypto.createHash('sha512');
    var file = req.files.attachment;
    var hashedName = hash.update(file.data).digest('hex');
    var attachmentId = req.params.attachId;
    exports.dbClient.query('INSERT INTO submit_log(student_id, attachment_id, email, file_name) VALUES (?,?,?,?);', [req.session.studentId, attachmentId, req.session.email, hashedName], function (err, insertResult) {
        if (err) {
            app_1.logger.error('[rest_api::uploadAttach::insert] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
            res.sendStatus(500);
            return;
        }
        app_1.logger.debug('[uploadAttach:insert into submit_log]');
        app_1.logger.debug(util.inspect(insertResult, { showHidden: false, depth: 1 }));
        file.mv(path.join(app_1.submittedHomeworkPath, hashedName), function (err) {
            if (err) {
                app_1.logger.error('[rest_api::uploadAttach::file_move] : ');
                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                res.sendStatus(500);
                return;
            }
        });
        res.sendStatus(202);
    });
}
exports.uploadAttach = uploadAttach;
/**
 * Check uploaded name is already exist.
 *
 * @method hwNameChecker
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
function hwNameChecker(req, res) {
    if (!req.session.admin)
        return res.sendStatus(401);
    exports.dbClient.query('SELECT * FROM homework WHERE name = ?;', encodeURIComponent(req.query.name), function (err, searchResult) {
        if (err) {
            app_1.logger.error('[rest_api::hwNameChecker::select] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
            res.sendStatus(500);
            return;
        }
        res.sendStatus(searchResult.length == 0 ? 200 : 409);
    });
}
exports.hwNameChecker = hwNameChecker;
/**
 * Run and return result uploaded exercise
 *
 * @method runExercise
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
function runExercise(req, res) {
    if (!req.session.signIn)
        return res.sendStatus(401);
    var hash = crypto.createHash('sha512');
    var file = req.files.attachment;
    var attachId = req.params.attachId;
    var studentId = req.session.studentId;
    var encodingInfo = charsetDetector(file.data);
    app_1.logger.debug(util.inspect(encodingInfo, { showHidden: false, depth: 1 }));
    var hashedOriginal = crypto.createHash('sha512').update(file.data).digest('hex');
    var fileContent;
    if (encodingInfo.encoding == 'UTF-8') {
        fileContent = iconv.decode(file.data, encodingInfo.encoding);
    }
    else {
        fileContent = iconv.decode(file.data, 'EUC-KR');
    }
    var hashedName = hash.update(fileContent).digest('hex');
    if (hashedName == hashedOriginal) {
        hashedOriginal = null;
    }
    else {
        // backup original file
        fs.writeFile(path.join(app_1.submittedExerciseOriginalPath, hashedOriginal), file.data, { mode: 384 }, function (err) {
            if (err) {
                app_1.logger.error('[rest_api::runExercise::writeOriginalFile] : ');
                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
            }
        });
    }
    fs.writeFile(path.join(app_1.submittedExercisePath, hashedName), fileContent, { mode: 384 }, function (err) {
        if (err) {
            app_1.logger.error('[rest_api::runExercise::writeFile] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
        }
    });
    // get information of this exercise by given id (attachId)
    exports.dbClient.query('SELECT name, extension, test_set_size, input_through_arg FROM exercise_config WHERE id = ?;', attachId, function (err, searchResult) {
        if (err) {
            app_1.logger.error('[rest_api::runExercise::select] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
            res.sendStatus(500);
            return;
        }
        // a temporarily created shared path that contains source code to judge
        var sourcePath = fs.mkdtempSync(path.join(app_1.tempPath, studentId + '_'));
        // a temporarily created shared path that will contain output
        var outputPath = fs.mkdtempSync(path.join(app_1.tempPath, studentId + '_'));
        // write config file of this judge to shared folder
        fs.writeFile(path.join(sourcePath, 'config.json'), JSON.stringify({
            sourceName: searchResult[0].name,
            extension: searchResult[0].extension,
            testSetSize: searchResult[0].test_set_size,
            inputThroughArg: searchResult[0].input_through_arg
        }), { mode: 256 });
        // copy given source code to shared folder
        fs.writeFileSync(path.join(sourcePath, searchResult[0].name), fileContent, { mode: 384 });
        exports.dbClient.query('INSERT INTO exercise_log (student_id, attachment_id, email, file_name, original_file) VALUE (?, ?, ?, ?, ?);', [studentId, attachId, req.session.email, hashedName, hashedOriginal], function (err, insertResult) {
            if (err) {
                app_1.logger.error('[rest_api::runExercise::insert] : ');
                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                res.sendStatus(500);
                return;
            }
            app_1.logger.debug('[runExercise:insert into exercise_log]');
            app_1.logger.debug(util.inspect(insertResult, { showHidden: false, depth: 1 }));
            judgeExercise(res, insertResult.insertId, attachId, studentId, outputPath, sourcePath);
        });
    });
}
exports.runExercise = runExercise;
/**
 * Rejudge unresolved exercise
 *
 * @method resolve
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
function resolve(req, res) {
    if (!req.session.admin)
        return res.sendStatus(401);
    exports.dbClient.query('SELECT exercise_log.id, exercise_log.attachment_id AS `attachId`, exercise_log.student_id AS `studentId`, file_name AS `fileName` ' +
        'FROM exercise_log ' +
        '    LEFT JOIN exercise_result ON exercise_result.log_id = exercise_log.id ' +
        'WHERE exercise_result.id IS NULL;', function (err, searchList) {
        if (err) {
            app_1.logger.error('[rest_api::resolve::search] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
            res.sendStatus(500);
            return;
        }
        var _loop_1 = function (log) {
            // get information of this exercise by given id (attachId)
            exports.dbClient.query('SELECT name, extension, test_set_size, input_through_arg FROM exercise_config WHERE id = ?;', log.attachId, function (err, exerciseSetting) {
                if (err) {
                    app_1.logger.error('[rest_api::resolve::select] : ');
                    app_1.logger.error(util.inspect(err, { showHidden: false, depth: 1 }));
                    res.sendStatus(500);
                    return;
                }
                // a temporarily created shared path that contains source code to judge
                var sourcePath = fs.mkdtempSync(path.join(app_1.tempPath, log.studentId + '_'));
                // a temporarily created shared path that will contain output
                var outputPath = fs.mkdtempSync(path.join(app_1.tempPath, log.studentId + '_'));
                // write config file of this judge to shared folder
                fs.writeFile(path.join(sourcePath, 'config.json'), JSON.stringify({
                    sourceName: exerciseSetting[0].name,
                    extension: exerciseSetting[0].extension,
                    testSetSize: exerciseSetting[0].test_set_size,
                    inputThroughArg: exerciseSetting[0].input_through_arg
                }), { mode: 256 });
                // copy given source code to shared folder
                fs_ext.copySync(path.join(app_1.submittedExercisePath, log.fileName), path.join(sourcePath, exerciseSetting[0].name));
                judgeExercise(null, log.id, log.attachId, log.studentId, outputPath, sourcePath);
            });
        };
        for (var _i = 0, searchList_1 = searchList; _i < searchList_1.length; _i++) {
            var log = searchList_1[_i];
            _loop_1(log);
        }
    });
    return res.sendStatus(200);
}
exports.resolve = resolve;
function judgeExercise(res, logId, attachId, studentId, outputPath, sourcePath) {
    var inputPath = path.join(app_1.exerciseSetPath, attachId.toString(), 'input');
    var answerPath = path.join(app_1.exerciseSetPath, attachId.toString(), 'output');
    app_1.docker.run('judge_server', ['bash', './judge.sh'], [{
            write: function (message) {
                app_1.logger.debug('[rest_api::runExercise::docker.stdout]');
                app_1.logger.debug(message.toString());
            }
        }, {
            write: function (message) {
                app_1.logger.error('[rest_api::runExercise::docker.stderr]');
                app_1.logger.error(message.toString());
            }
        }], {
        Volumes: {
            '/home/tester/source': {},
            '/home/tester/input': {},
            '/home/tester/output': {},
            '/home/tester/answer': {}
        },
        HostConfig: {
            Binds: [
                sourcePath + ':/home/tester/source:ro',
                inputPath + ':/home/tester/input:ro',
                outputPath + ':/home/tester/output:rw',
                answerPath + ':/home/tester/answer:ro'
            ]
        },
        Tty: false
    }, function (err, data, container) {
        if (err) {
            app_1.logger.error('[rest_api::runExercise::docker_run] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
            res.sendStatus(500);
            return;
        }
        handleResult(res, logId, attachId, studentId, answerPath, inputPath, outputPath);
        // remove input temporary folder
        fs_ext.remove(sourcePath, function (err) {
            if (err) {
                app_1.logger.error('[rest_api::judgeExercise::temp_remove] : ');
                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
            }
        });
        container.remove();
    });
}
function handleResult(res, logId, attachId, studentId, answerPath, inputPath, outputPath) {
    var resultFile = path.join(outputPath, 'result.json');
    fs.exists(resultFile, function (exists) {
        // if result.js is exist, it means that this judge was successful or runtime exceptions or timeout occur
        if (exists) {
            fs.readFile(resultFile, 'UTF-8', function (err, data) {
                var result = JSON.parse(data);
                // remove output temporary folder
                fs_ext.remove(outputPath, function (err) {
                    if (err) {
                        app_1.logger.error('[rest_api::handleResult::temp_remove] : ');
                        app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                    }
                });
                // the judge was correct
                if (result.isMatched) {
                    if (res)
                        res.sendStatus(200);
                    exports.dbClient.query('INSERT INTO exercise_result (log_id, type, runtime_error) VALUE (?, ?, ?);', [logId, 0 /* correct */, result.errorLog], function (err) {
                        if (err) {
                            app_1.logger.error('[rest_api::handleResult::insert_judge_correct] : ');
                            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                        }
                    });
                    if (result.errorLog) {
                        app_1.logger.error('[rest_api::handleResult::insert_judge_correct-found_error] ' + logId);
                    }
                    exports.dbClient.query('INSERT IGNORE INTO exercise_quick_result (attach_id, student_id, result) VALUE (?, ?, ?);', [attachId, studentId, true], function (err) {
                        if (err) {
                            app_1.logger.error('[rest_api::handleResult::insert_judge_correct] : ');
                            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                        }
                    });
                }
                else if ('returnCode' in result) {
                    // timeout
                    if (result.returnCode == 124) {
                        fs.readFile(path.join(inputPath, result.inputIndex + '.in'), 'UTF-8', function (err, data) {
                            if (err) {
                                app_1.logger.error('[rest_api::handleResult::read_file::read_file:timeout] : ');
                                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                                if (res)
                                    res.sendStatus(500);
                                return;
                            }
                            if (res)
                                res.status(410).json({ input: data });
                        });
                        exports.dbClient.query('INSERT INTO exercise_result (log_id, type, return_code, failed_index) VALUE (?, ?, ?, ?);', [logId, 3 /* timeout */, result.returnCode, result.inputIndex], function (err) {
                            if (err) {
                                app_1.logger.error('[rest_api::handleResult::insert_judge_timeout] : ');
                                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                            }
                        });
                    }
                    else {
                        fs.readFile(path.join(inputPath, result.inputIndex + '.in'), 'UTF-8', function (err, data) {
                            if (err) {
                                app_1.logger.error('[rest_api::handleResult::read_file::read_file:runtimeError] : ');
                                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                                if (res)
                                    res.sendStatus(500);
                                return;
                            }
                            if (res)
                                res.status(412).json({
                                    input: data,
                                    errorLog: result.errorLog,
                                    returnCode: result.returnCode
                                });
                        });
                        exports.dbClient.query('INSERT INTO exercise_result (log_id, type, return_code, runtime_error, failed_index) VALUE (?, ?, ?, ?, ?);', [logId, 4 /* runtimeError */, result.returnCode, result.errorLog, result.inputIndex], function (err) {
                            if (err) {
                                app_1.logger.error('[rest_api::handleResult::insert_judge_runtime_error] : ');
                                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                            }
                        });
                    }
                }
                else {
                    fs.readFile(path.join(answerPath, result.inputIndex + '.out'), 'UTF-8', function (err, data) {
                        if (err) {
                            app_1.logger.error('[rest_api::handleResult::read_file] : ');
                            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                            if (res)
                                res.sendStatus(500);
                            return;
                        }
                        var answerOutput = data;
                        fs.readFile(path.join(inputPath, result.inputIndex + '.in'), 'UTF-8', function (err, data) {
                            if (err) {
                                app_1.logger.error('[rest_api::handleResult::read_file::read_file] : ');
                                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                                res.sendStatus(500);
                                return;
                            }
                            if (res)
                                res.status(406).json({
                                    userOutput: result.userOutput,
                                    answerOutput: answerOutput,
                                    input: data
                                });
                        });
                    });
                    exports.dbClient.query('INSERT INTO exercise_result (log_id, type, failed_index, user_output, runtime_error) VALUE (?, ?, ?, ?, ?);', [logId, 1 /* incorrect */, result.inputIndex, result.userOutput, result.errorLog], function (err) {
                        if (err) {
                            app_1.logger.error('[rest_api::handleResult::insert_judge_incorrect] : ');
                            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                        }
                    });
                }
            });
        }
        else {
            var errorLogFile_1 = path.join(outputPath, 'error.log');
            fs.exists(errorLogFile_1, function (exists) {
                // script error
                if (exists) {
                    fs.readFile(errorLogFile_1, 'UTF-8', function (err, errorStr) {
                        if (err) {
                            app_1.logger.error('[rest_api::handleResult::read_file] : ');
                            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                            if (res)
                                res.sendStatus(500);
                            return;
                        }
                        if (res)
                            res.status(417).json({ errorMsg: errorStr });
                        // remove output temporary folder
                        fs_ext.remove(outputPath, function (err) {
                            if (err) {
                                app_1.logger.error('[rest_api::handleResult::remove_file] : ');
                                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                            }
                        });
                        exports.dbClient.query('INSERT INTO exercise_result(log_id, type, script_error) VALUE(?, ?, ?);', [logId, 5 /* scriptError */, errorStr], function (err) {
                            if (err) {
                                app_1.logger.error('[rest_api::handleResult::insert_script_error] : ');
                                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                            }
                        });
                    });
                }
                else {
                    var compileErrorFile_1 = path.join(outputPath, 'compile_error.log');
                    fs.exists(compileErrorFile_1, function (exists) {
                        // compile error
                        if (exists) {
                            fs.readFile(compileErrorFile_1, 'UTF-8', function (err, errorStr) {
                                if (err) {
                                    app_1.logger.error('[rest_api::handleResult::read_file] : ');
                                    app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                                    if (res)
                                        res.sendStatus(500);
                                    return;
                                }
                                // remove output temporary folder
                                fs_ext.remove(outputPath, function (err) {
                                    if (err) {
                                        app_1.logger.error('[rest_api::handleResult::remove_file] : ');
                                        app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                                    }
                                });
                                if (res)
                                    res.status(400).json({ errorMsg: errorStr });
                                exports.dbClient.query('INSERT INTO exercise_result(log_id, type, compile_error) VALUE(?,?,?);', [logId, 2 /* compileError */, errorStr], function (err) {
                                    if (err) {
                                        app_1.logger.error('[rest_api::handleResult::insert_compile_error] : ');
                                        app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                                    }
                                });
                            });
                        }
                        else {
                            app_1.logger.error('[rest_api::handleResult::something_else]');
                            if (res)
                                res.status(500).json({ id: logId });
                        }
                    });
                }
            });
        }
    });
}
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
    // FIXME: category: All, id: only one exercise => one exercise & all homework ---> remove category! and enforce server to recognize query only by ids
    if (query.t & 2) {
        var exerciseQuery_1 = commonQuery;
        if (query.ex)
            exerciseQuery_1 += ' AND attachment_id IN (' + mysql_1.escape(query.ex) + ')';
        if (query.r)
            exerciseQuery_1 += ' AND type IN (' + mysql_1.escape(query.r) + ')';
        if (req.session.admin) {
            tasks.push(function (callback) {
                exports.dbClient.query('SELECT exercise_log.id, user.student_id AS `studentId`, email, submitted AS `timestamp`, exercise_config.name AS `fileName`, extension, type AS `result`, "Exercise" AS `category`, user.name ' +
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
                exports.dbClient.query('SELECT exercise_log.id, student_id AS `studentId`, email, submitted AS `timestamp`, name AS `fileName`, extension, type AS `result`, "Exercise" AS `category` ' +
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
                exports.dbClient.query('SELECT submit_log.id, user.student_id AS `studentId`, email, submitted AS `timestamp`, hw_config.name AS `fileName`, extension, "Homework" AS `category`, user.name ' +
                    'FROM submit_log ' +
                    '    JOIN hw_config ON submit_log.attachment_id = hw_config.id ' +
                    '    JOIN user ON submit_log.student_id = user.student_id ' +
                    'WHERE ' + homeworkQuery_1 + ' ' +
                    'ORDER BY submitted', callback);
            });
        }
        else {
            tasks.push(function (callback) {
                exports.dbClient.query('SELECT submit_log.id, student_id AS `studentId`, email, submitted AS `timestamp`, name AS `fileName`, extension, "Homework" AS `category` ' +
                    'FROM submit_log ' +
                    '    JOIN hw_config ON submit_log.attachment_id = hw_config.id ' +
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
/**
 * Send judge result of exercise data.
 *
 * @method judgeResult
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
function judgeResult(req, res) {
    if (!req.session.signIn)
        return 401;
    exports.dbClient.query('SELECT student_id, attachment_id, type, compile_error, failed_index, user_output, return_code, runtime_error, script_error ' +
        'FROM exercise_log JOIN exercise_result ON exercise_log.id = exercise_result.log_id ' +
        'WHERE log_id = ?', req.params.logId, function (err, searchResult) {
        if (err) {
            app_1.logger.error('[rest_api::judgeResult::search] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
            res.sendStatus(500);
            return;
        }
        var result = searchResult[0];
        // if non-admin user requested another one's result
        if (!req.session.admin && req.session.studentId != result.student_id) {
            res.sendStatus(401);
            return;
        }
        var testSetPath = path.join(app_1.exerciseSetPath, result.attachment_id.toString());
        switch (result.type) {
            case 0 /* correct */:
                res.sendStatus(200);
                break;
            case 1 /* incorrect */:
                var tasks = [
                    function (callback) {
                        fs.readFile(path.join(testSetPath, 'input', result.failed_index + '.in'), 'UTF-8', callback);
                    },
                    function (callback) {
                        fs.readFile(path.join(testSetPath, 'output', result.failed_index + '.out'), 'UTF-8', callback);
                    }
                ];
                async.parallel(tasks, function (err, data) {
                    if (err) {
                        app_1.logger.error('[rest_api::handleResult::judgeResult::incorrect::read_file] : ');
                        app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
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
            case 2 /* compileError */:
                res.status(400).json({ errorMsg: result.compile_error });
                break;
            case 3 /* timeout */:
                fs.readFile(path.join(testSetPath, 'input', result.failed_index + '.in'), 'UTF-8', function (err, data) {
                    if (err) {
                        app_1.logger.error('[rest_api::handleResult::judgeResult::timeout::read_file] : ');
                        app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                        res.sendStatus(500);
                        return;
                    }
                    res.status(410).json({ input: data });
                });
                break;
            case 4 /* runtimeError */:
                fs.readFile(path.join(testSetPath, 'input', result.failed_index + '.in'), 'UTF-8', function (err, data) {
                    if (err) {
                        app_1.logger.error('[rest_api::handleResult::judgeResult::runtimeError::read_file] : ');
                        app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
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
            case 5 /* scriptError */:
                res.status(417).json({ errorMsg: result.script_error });
                break;
        }
    });
}
exports.judgeResult = judgeResult;
/**
 * Send exercise file.
 *
 * @method getExercise
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
function getExercise(req, res) {
    if (!req.session.signIn)
        return res.sendStatus(401);
    exports.dbClient.query('SELECT student_id AS `studentId`, file_name AS `fileName`, original_file AS `originalFile`, name ' +
        'FROM exercise_log JOIN exercise_config ON exercise_log.attachment_id = exercise_config.id ' +
        'WHERE exercise_log.id=?', req.params.logId, function (err, result) {
        if (err) {
            app_1.logger.error('[rest_api::getExercise::search] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
            res.sendStatus(500);
            return;
        }
        var row = result[0];
        if (req.session.admin || row.studentId == req.session.studentId) {
            if (row.originalFile) {
                res.download(path.join(app_1.submittedExerciseOriginalPath, row.originalFile), row.name);
            }
            else {
                res.download(path.join(app_1.submittedExercisePath, row.fileName), row.name);
            }
        }
        else {
            app_1.logger.error('[rest_api::getExercise::student_id-mismatch]');
            res.sendStatus(401);
        }
    });
}
exports.getExercise = getExercise;
/**
 * Send homework file.
 *
 * @method getHomework
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
function getHomework(req, res) {
    if (!req.session.signIn)
        return res.sendStatus(401);
    exports.dbClient.query('SELECT student_id AS `studentId`, file_name AS `fileName`, name ' +
        'FROM submit_log JOIN hw_config ON submit_log.attachment_id = hw_config.id ' +
        'WHERE submit_log.id=?', req.params.logId, function (err, result) {
        if (err) {
            app_1.logger.error('[rest_api::getHomework::search] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
            res.sendStatus(500);
            return;
        }
        var row = result[0];
        if (req.session.admin || row.studentId == req.session.studentId) {
            res.download(path.join(app_1.submittedHomeworkPath, row.fileName), row.name);
        }
        else {
            app_1.logger.error('[rest_api::getHomework::student_id-mismatch]');
            res.sendStatus(401);
        }
    });
}
exports.getHomework = getHomework;
