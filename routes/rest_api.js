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
                // FIXME: error handling
                app_1.logger.error('[rest_api::signIn::select] : ');
                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
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
    if (req.session.signIn) {
        return res.sendStatus(401);
    }
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
                // FIXME: error handling
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
                    // FIXME: error handling
                    app_1.logger.error('[rest_api::register::insert] : ');
                    app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                    res.sendStatus(500);
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
    if (!req.session.admin) {
        return res.sendStatus(401);
    }
    var name = encodeURIComponent(req.body.name);
    var start_date = req.body.start;
    var end_date = req.body.due;
    var description = req.body.description;
    exports.dbClient.query('INSERT INTO homework(name, start_date, end_date, author_id, author_email, description) VALUES(?,?,?,?,?,?);', [name, start_date, end_date, req.session.studentId, req.session.email, description], function (err, insertResult) {
        if (err) {
            // FIXME: error handling
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
                // FIXME: error handling
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
    if (!req.session.signIn) {
        return res.sendStatus(401);
    }
    var hash = crypto.createHash('sha512');
    var file = req.files.attachment;
    var hashedName = hash.update(file.data).digest('hex');
    var attachmentId = req.params.attachId;
    exports.dbClient.query('INSERT INTO submit_log(student_id, attachment_id, email, file_name) VALUES (?,?,?,?);', [req.session.studentId, attachmentId, req.session.email, hashedName], function (err, insertResult) {
        if (err) {
            // FIXME: error handling
            app_1.logger.error('[rest_api::uploadAttach::insert] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
            res.sendStatus(500);
            return;
        }
        app_1.logger.debug('[uploadAttach:insert into submit_log]');
        app_1.logger.debug(util.inspect(insertResult, { showHidden: false, depth: 1 }));
        file.mv(path.join(app_1.submittedHomeworkPath, hashedName), function (err) {
            if (err) {
                // FIXME: error handling
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
    if (!req.session.admin) {
        return res.sendStatus(401);
    }
    exports.dbClient.query('SELECT * FROM homework WHERE name = ?;', req.query.name, function (err, searchResult) {
        if (err) {
            // FIXME: error handling
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
    if (!req.session.signIn) {
        return res.sendStatus(401);
    }
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
                // FIXME: error handling
                app_1.logger.error('[rest_api::runExercise::writeOriginalFile] : ');
                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
            }
        });
    }
    fs.writeFile(path.join(app_1.submittedExercisePath, hashedName), fileContent, { mode: 384 }, function (err) {
        if (err) {
            // FIXME: error handling
            app_1.logger.error('[rest_api::runExercise::writeFile] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
        }
    });
    // get information of this exercise by given id (attachId)
    exports.dbClient.query('SELECT name, extension, test_set_size FROM exercise_config WHERE id = ?;', attachId, function (err, searchResult) {
        if (err) {
            // FIXME: error handling
            app_1.logger.error('[rest_api::runExercise::select] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
            res.sendStatus(500);
            return;
        }
        // a temporarily created shared path that contains source code to judge
        var sourcePath = fs.mkdtempSync(path.join(app_1.tempPath, req.session.studentId + '_'));
        // a temporarily created shared path that will contain output
        var outputPath = fs.mkdtempSync(path.join(app_1.tempPath, req.session.studentId + '_'));
        var inputPath = path.join(app_1.exerciseSetPath, attachId, 'input');
        var answerPath = path.join(app_1.exerciseSetPath, attachId, 'output');
        // write config file of this judge to shared folder
        fs.writeFile(path.join(sourcePath, 'config.json'), JSON.stringify({
            sourceName: searchResult[0].name,
            extension: searchResult[0].extension,
            testSetSize: searchResult[0].test_set_size
        }), { mode: 438 });
        // copy given source code to shared folder
        fs.writeFileSync(path.join(sourcePath, searchResult[0].name), fileContent, { mode: 384 });
        exports.dbClient.query('INSERT INTO exercise_log (student_id, attachment_id, email, file_name, original_file) VALUE (?, ?, ?, ?, ?);', [req.session.studentId, attachId, req.session.email, hashedName, hashedOriginal], function (err, insertResult) {
            if (err) {
                // FIXME: error handling
                app_1.logger.error('[rest_api::runExercise::insert] : ');
                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                res.sendStatus(500);
                return;
            }
            app_1.logger.debug('[runExercise:insert into exercise_log]');
            app_1.logger.debug(util.inspect(insertResult, { showHidden: false, depth: 1 }));
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
                }], // TODO: redirect these
            {
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
                    // FIXME: error handling
                    app_1.logger.error('[rest_api::runExercise::docker_run] : ');
                    app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                    res.sendStatus(500);
                    return;
                }
                handleResult(res, insertResult.insertId, attachId, studentId, answerPath, inputPath, outputPath);
                // remove input temporary folder
                fs_ext.remove(sourcePath, function (err) {
                    if (err) {
                        // FIXME: error handling
                        app_1.logger.error('[rest_api::runExercise::temp_remove] : ');
                        app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                    }
                });
                container.remove();
            });
        });
    });
}
exports.runExercise = runExercise;
function handleResult(res, logId, attachId, studentId, answerPath, inputPath, outputPath) {
    var resultFile = path.join(outputPath, 'result.json');
    fs.exists(resultFile, function (exists) {
        // if result.js is exist, it means that this judge was successful
        if (exists) {
            fs.readFile(resultFile, 'UTF-8', function (err, data) {
                var result = JSON.parse(data.toString());
                // remove output temporary folder
                fs_ext.remove(outputPath, function (err) {
                    if (err) {
                        // FIXME: error handling
                        app_1.logger.error('[rest_api::runExercise::temp_remove] : ');
                        app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                        res.sendStatus(500);
                    }
                });
                // the judge was correct
                if (result.isMatched) {
                    res.sendStatus(200);
                    exports.dbClient.query('INSERT INTO exercise_result (log_id, type, runtime_error) VALUE (?, ?, ?);', [logId, 0, result.errorLog], function (err) {
                        if (err) {
                            // FIXME: error handling
                            app_1.logger.error('[rest_api::runExercise::insert_judge_correct] : ');
                            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                        }
                    });
                    if (result.errorLog) {
                        app_1.logger.error('[rest_api::runExercise::insert_judge_correct-found_error] ' + logId);
                    }
                    exports.dbClient.query('INSERT IGNORE INTO exercise_quick_result (attach_id, student_id, result) VALUE (?, ?, ?);', [attachId, studentId, true], function (err) {
                        if (err) {
                            // FIXME: error handling
                            app_1.logger.error('[rest_api::runExercise::insert_judge_correct] : ');
                            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                        }
                    });
                }
                else if ('returnCode' in result) {
                    // timeout
                    if (result.returnCode == 124) {
                        fs.readFile(path.join(inputPath, result.inputIndex + '.in'), 'UTF-8', function (err, data) {
                            if (err) {
                                // FIXME: error handling
                                app_1.logger.error('[rest_api::runExercise::read_file::read_file:timeout] : ');
                                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                                res.sendStatus(500);
                                return;
                            }
                            res.status(408).json({ input: data.toString() });
                        });
                        exports.dbClient.query('INSERT INTO exercise_result (log_id, type, return_code, unmatched_index) VALUE (?, ?, ?, ?);', [logId, 3, result.returnCode, result.inputIndex], function (err) {
                            if (err) {
                                // FIXME: error handling
                                app_1.logger.error('[rest_api::runExercise::insert_judge_timeout] : ');
                                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                            }
                        });
                    }
                    else {
                        fs.readFile(path.join(inputPath, result.inputIndex + '.in'), 'UTF-8', function (err, data) {
                            if (err) {
                                // FIXME: error handling
                                app_1.logger.error('[rest_api::runExercise::read_file::read_file:runtimeError] : ');
                                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                                res.sendStatus(500);
                                return;
                            }
                            res.status(412).json({
                                input: data.toString(),
                                errorLog: result.errorLog,
                                returnCode: result.returnCode
                            });
                        });
                        exports.dbClient.query('INSERT INTO exercise_result (log_id, type, return_code, runtime_error, unmatched_index) VALUE (?, ?, ?, ?, ?);', [logId, 4, result.returnCode, result.errorLog, result.inputIndex], function (err) {
                            if (err) {
                                // FIXME: error handling
                                app_1.logger.error('[rest_api::runExercise::insert_judge_runtime_error] : ');
                                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                            }
                        });
                    }
                }
                else {
                    fs.readFile(path.join(answerPath, result.inputIndex + '.out'), 'UTF-8', function (err, data) {
                        if (err) {
                            // FIXME: error handling
                            app_1.logger.error('[rest_api::runExercise::read_file] : ');
                            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                            res.sendStatus(500);
                            return;
                        }
                        var answerOutput = data.toString();
                        fs.readFile(path.join(inputPath, result.inputIndex + '.in'), 'UTF-8', function (err, data) {
                            if (err) {
                                // FIXME: error handling
                                app_1.logger.error('[rest_api::runExercise::read_file::read_file] : ');
                                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                                res.sendStatus(500);
                                return;
                            }
                            res.status(406).json({
                                userOutput: result.userOutput,
                                answerOutput: answerOutput,
                                input: data.toString()
                            });
                        });
                    });
                    exports.dbClient.query('INSERT INTO exercise_result (log_id, type, unmatched_index, unmatched_output, runtime_error) VALUE (?, ?, ?, ?, ?);', [logId, 1, result.inputIndex, result.userOutput, result.errorLog], function (err) {
                        if (err) {
                            // FIXME: error handling
                            app_1.logger.error('[rest_api::runExercise::insert_judge_incorrect] : ');
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
                    fs.readFile(errorLogFile_1, function (err, data) {
                        if (err) {
                            // FIXME: error handling
                            app_1.logger.error('[rest_api::runExercise::read_file] : ');
                            app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                            res.sendStatus(500);
                            return;
                        }
                        // remove output temporary folder
                        fs_ext.remove(outputPath, function (err) {
                            if (err) {
                                // FIXME: error handling
                                app_1.logger.error('[rest_api::runExercise::remove_file] : ');
                                app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                            }
                        });
                        var errorStr = data.toString('UTF-8');
                        console.log(errorStr);
                        res.status(417).json({ errorMsg: errorStr });
                        exports.dbClient.query('INSERT INTO exercise_result(log_id, type, script_error) VALUE(?, ?, ?);', [logId, 5, errorStr], function (err) {
                            if (err) {
                                // FIXME: error handling
                                app_1.logger.error('[rest_api::runExercise::insert_script_error] : ');
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
                            fs.readFile(compileErrorFile_1, function (err, data) {
                                if (err) {
                                    // FIXME: error handling
                                    app_1.logger.error('[rest_api::runExercise::read_file] : ');
                                    app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                                    res.sendStatus(500);
                                    return;
                                }
                                // remove output temporary folder
                                fs_ext.remove(outputPath, function (err) {
                                    if (err) {
                                        // FIXME: error handling
                                        app_1.logger.error('[rest_api::runExercise::remove_file] : ');
                                        app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                                    }
                                });
                                var errorStr = data.toString('UTF-8');
                                res.status(400).json({ errorMsg: errorStr });
                                exports.dbClient.query('INSERT INTO exercise_result(log_id, type, compile_error) VALUE(?,?,?);', [logId, 2, errorStr], function (err) {
                                    if (err) {
                                        // FIXME: error handling
                                        app_1.logger.error('[rest_api::runExercise::insert_compile_error] : ');
                                        app_1.logger.error(util.inspect(err, { showHidden: false, depth: null }));
                                    }
                                });
                            });
                        }
                        else {
                            // FIXME: error handling
                            app_1.logger.error('[rest_api::runExercise::something_else]');
                            res.sendStatus(500);
                        }
                    });
                }
            });
        }
    });
}
/**
 * Give history data.
 *
 * @method historyList
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
function historyList(req, res) {
    if (!req.session.signIn) {
        return res.sendStatus(401);
    }
    console.log(req.query);
    var query = req.query;
    var queryStr = '';
    if (query.ex)
        queryStr += ' AND attachment_id IN (' + mysql_1.escape(query.ex) + ')';
    if (query.r)
        queryStr += ' AND type IN (' + mysql_1.escape(query.r) + ')';
    if (query.e)
        queryStr += ' AND email IN (' + mysql_1.escape(query.e) + ')';
    exports.dbClient.query('SELECT exercise_log.id, student_id, email, file_name, submitted, name, extension, type ' +
        'FROM exercise_log ' +
        '    JOIN exercise_config ON exercise_log.attachment_id = exercise_config.id ' +
        '    LEFT JOIN exercise_result ON exercise_log.id = exercise_result.log_id ' +
        'WHERE student_id=? ' + queryStr, req.session.studentId, function (err, result) {
        if (err) {
            console.error(err);
            return;
        }
        res.json(result);
    });
}
exports.historyList = historyList;
