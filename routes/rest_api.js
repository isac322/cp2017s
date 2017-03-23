"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var crypto = require("crypto");
var fs = require("fs");
var fs_ext = require("fs-extra");
var mysql_1 = require("mysql");
var path = require("path");
var app_1 = require("../app");
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
                console.error('[rest_api::signIn::select] : ', err);
            }
            console.log('\n[signIn]');
            console.log(result);
            console.log();
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
            if (err || selectResult.length != 1) {
                // FIXME: error handling
                console.error('[rest_api::register::select] : ', err);
                res.sendStatus(500);
                return;
            }
            console.log('\n[register:outer]');
            console.log(selectResult);
            console.log();
            // TODO: check not listed student exception
            exports.dbClient.query('INSERT INTO email VALUES (?,?,?);', [studentId, email, nameInGoogle], function (err, insertResult) {
                if (err) {
                    // FIXME: error handling
                    console.error('[rest_api::register::insert] : ', err);
                    res.sendStatus(500);
                }
                console.log('\n[register:inner]');
                console.log(insertResult);
                console.log();
                req.session.admin = selectResult[0].is_admin == '1';
                req.session.email = email;
                req.session.name = decodeURIComponent(selectResult[0].name);
                req.session.signIn = true;
                req.session.studentId = selectResult[0].student_id;
                return res.redirect('/');
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
            console.error('[rest_api::createHW::outer_insert] : ', err);
            res.sendStatus(500);
            return;
        }
        console.log('\n[createHW:insert into homework]');
        console.log(insertResult);
        console.log();
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
                console.error('[rest_api::createHW::inner_insert] : ', err);
                res.sendStatus(500);
                return;
            }
            console.log('\n[createHW:insert into hw_config]');
            console.log(result);
            console.log();
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
    exports.dbClient.query('SELECT homework.end_date ' +
        'FROM homework JOIN hw_config ' +
        '     ON hw_config.homework_id = homework.homework_id ' +
        'WHERE hw_config.id = ?;', attachmentId, function (err, searchResult) {
        if (err) {
            console.log(err);
        }
        console.log(searchResult);
        console.log(searchResult[0].end_date);
        console.log(typeof searchResult[0].end_date);
        // TODO: if this upload already past deadline, discard the upload
    });
    exports.dbClient.query('INSERT INTO submit_log(student_id, attachment_id, email, file_name) VALUES (?,?,?,?);', [req.session.studentId, attachmentId, req.session.email, hashedName], function (err, insertResult) {
        if (err) {
            // FIXME: error handling
            console.error('[rest_api::uploadAttach::insert] : ', err);
            res.sendStatus(500);
            return;
        }
        console.log('\n[uploadAttach:insert into submit_log]');
        console.log(insertResult);
        console.log();
        file.mv(path.join('media', 'homework', hashedName), function (err) {
            if (err) {
                // FIXME: error handling
                console.error('[rest_api::uploadAttach::file_move] : ', err);
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
            console.error('[rest_api::hwNameChecker::select] : ', err);
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
    var hashedName = hash.update(file.data).digest('hex');
    var attachId = req.params.attachId;
    file.mv(path.join('media', 'exercise', hashedName), function (err) {
        if (err) {
            // FIXME: error handling
            console.error('[rest_api::runExercise::file_move] : ', err);
            res.sendStatus(500);
            return;
        }
    });
    // get information of this exercise by given id (attachId)
    exports.dbClient.query('SELECT name, extension, test_set_size FROM exercise_config WHERE id = ?;', attachId, function (err, searchResult) {
        if (err) {
            // FIXME: error handling
            console.error('[rest_api::runExercise::select] : ', err);
            res.sendStatus(500);
            return;
        }
        else if (searchResult.length > 1) {
            console.error('[rest_api::runExercise] search result\'s length is higher than 1');
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
            test_set: searchResult[0].test_set_size
        }), { mode: 438 });
        // copy given source code to shared folder
        fs.writeFileSync(path.join(sourcePath, searchResult[0].name), file.data, { mode: 384 });
        exports.dbClient.query('INSERT INTO exercise_log (student_id, attachment_id, email, file_name) VALUE (?, ?, ?, ?);', [req.session.studentId, attachId, req.session.email, hashedName], function (err, insertResult) {
            if (err) {
                // FIXME: error handling
                console.error('[rest_api::runExercise::insert] : ', err);
                res.sendStatus(500);
                return;
            }
            console.log('\n[runExercise:insert into exercise_log]');
            console.log(insertResult);
            console.log();
            var logId = insertResult.insertId;
            app_1.docker.run('judge_server', ['bash', './judge.sh'], [process.stdout, process.stderr], // TODO: redirect these
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
                    console.error('[rest_api::runExercise::docker_run] : ', err);
                    res.sendStatus(500);
                    return;
                }
                var resultFile = path.join(outputPath, 'result.json');
                fs.exists(resultFile, function (exists) {
                    // if result.js is exist, it means that this judge was successful
                    if (exists) {
                        var result_1 = JSON.parse(fs.readFileSync(resultFile, 'utf-8'));
                        // remove output temporary folder
                        fs_ext.remove(outputPath, function (err) {
                            if (err) {
                                // FIXME: error handling
                                console.error('[rest_api::runExercise::temp_remove] : ', err);
                                res.sendStatus(500);
                                return;
                            }
                        });
                        // the judge was correct
                        if (result_1.isMatched) {
                            res.sendStatus(200);
                            exports.dbClient.query('INSERT INTO exercise_result (log_id, result) VALUE (?,?);', [logId, true], function (err, row) {
                                if (err) {
                                    // FIXME: error handling
                                    console.error('[rest_api::runExercise::insert_judge_correct] : ', err);
                                    res.sendStatus(500);
                                    return;
                                }
                            });
                            exports.dbClient.query('INSERT IGNORE INTO exercise_quick_result (attach_id, student_id, result) VALUE (?, ?, ?);', [attachId, req.session.studentId, true], function (err, row) {
                                if (err) {
                                    // FIXME: error handling
                                    console.error('[rest_api::runExercise::insert_judge_correct] : ', err);
                                    res.sendStatus(500);
                                    return;
                                }
                            });
                        }
                        else {
                            exports.dbClient.query('INSERT INTO exercise_result (log_id, result, unmatched_index, unmatched_output) VALUE (?, ?, ?, ?);', [logId, result_1.isMatched, result_1.unmatchedIndex, result_1.unmatchedOutput], function (err, row) {
                                if (err) {
                                    // FIXME: error handling
                                    console.error('[rest_api::runExercise::insert_judge_incorrect] : ', err);
                                    res.sendStatus(500);
                                    return;
                                }
                            });
                            fs.readFile(path.join(answerPath, result_1.unmatchedIndex + '.out'), function (err, data) {
                                if (err) {
                                    // FIXME: error handling
                                    console.error('[rest_api::runExercise::read_file] : ', err);
                                    res.sendStatus(500);
                                    return;
                                }
                                res.setHeader('Content-Type', 'application/json');
                                res.status(406).send(JSON.stringify({
                                    unmatchedIndex: result_1.unmatchedIndex,
                                    unmatchedOutput: result_1.unmatchedOutput,
                                    answerOutput: data.toString(),
                                    input: fs.readFileSync(path.join(inputPath, result_1.unmatchedIndex + '.in'), 'utf-8')
                                }));
                            });
                        }
                    }
                    else {
                        var compileErrorFile_1 = path.join(outputPath, 'compile_error.log');
                        // remove output temporary folder
                        fs_ext.remove(outputPath, function (err) {
                            if (err) {
                                // FIXME: error handling
                                console.error('[rest_api::runExercise::remove_file] : ', err);
                                res.sendStatus(500);
                                return;
                            }
                        });
                        fs.exists(compileErrorFile_1, function (exists) {
                            if (exists) {
                                fs.readFile(compileErrorFile_1, function (err, data) {
                                    if (err) {
                                        // FIXME: error handling
                                        console.error('[rest_api::runExercise::read_file] : ', err);
                                        res.sendStatus(500);
                                        return;
                                    }
                                    var errorStr = data.toString();
                                    res.setHeader('Content-Type', 'application/json');
                                    res.status(400).send(JSON.stringify({
                                        errorMsg: errorStr
                                    }));
                                    exports.dbClient.query('INSERT INTO exercise_result(log_id, result, error_msg) VALUE(?,?,?);', [logId, false, errorStr], function (err, row) {
                                        if (err) {
                                            // FIXME: error handling
                                            console.error('[rest_api::runExercise::insert_compile_error] : ', err);
                                            res.sendStatus(500);
                                            return;
                                        }
                                    });
                                });
                            }
                            else {
                                // TODO: error handling
                            }
                        });
                    }
                });
                // remove input temporary folder
                fs_ext.remove(sourcePath, function (err) {
                    if (err) {
                        // FIXME: error handling
                        console.error('[rest_api::runExercise::temp_remove] : ', err);
                        res.sendStatus(500);
                        return;
                    }
                });
                container.remove();
            });
        });
    });
}
exports.runExercise = runExercise;
