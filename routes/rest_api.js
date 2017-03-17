"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mysql_1 = require("mysql");
var fs = require("fs");
var crypto = require("crypto");
var path = require("path");
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
                throw err;
            }
            console.log('\n[signIn]');
            console.log(result);
            console.log();
            switch (result.length) {
                case 0:
                    res.sendStatus(404);
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
                throw err;
            }
            console.log('\n[register:outer]');
            console.log(selectResult);
            console.log();
            // TODO: check not listed student exception
            exports.dbClient.query('INSERT INTO email VALUES (?,?,?);', [studentId, email, nameInGoogle], function (err, insertResult) {
                if (err) {
                    // FIXME: error handling
                    throw err;
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
        return res.redirect('/homework');
    }
    else {
        var name_1 = encodeURIComponent(req.body.name);
        var start_date = req.body.start;
        var end_date = req.body.due;
        var description = req.body.description;
        exports.dbClient.query('INSERT INTO homework(name, start_date, end_date, author_id, description) VALUES(?,?,?,?,?);', [name_1, start_date, end_date, req.session.studentId, description], function (err, insertResult) {
            if (err) {
                // FIXME: error handling
                throw err;
            }
            console.log('\n[createHW:insert into homework]');
            console.log(insertResult);
            console.log();
            var id = insertResult.insertId;
            var values = [];
            for (var _i = 0, _a = req.body.attachment; _i < _a.length; _i++) {
                var attachment = _a[_i];
                var hwName = encodeURIComponent(attachment.name);
                var extension = attachment.extension;
                values.push([id, hwName, extension]);
            }
            exports.dbClient.query('INSERT INTO hw_config(homework_id, name, extension) VALUES ' + mysql_1.escape(values) + ';', function (err, result) {
                if (err) {
                    // FIXME: error handling
                    throw err;
                }
                console.log('\n[createHW:insert into hw_config]');
                console.log(result);
                console.log();
            });
            res.redirect('/homework');
        });
    }
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
        return res.redirect('/');
    }
    var hash = crypto.createHash('sha512');
    var file = req.files.attachment;
    var hashedName = hash.update(file.data).digest('hex');
    var attachmentId = req.params.attachId;
    exports.dbClient.query('INSERT INTO submit_log(student_id, attachment_id, email, file_name) VALUES (?,?,?,?);', [req.session.studentId, attachmentId, req.session.email, hashedName], function (err, insertResult) {
        if (err) {
            // FIXME: error handling
            throw err;
        }
        else {
            console.log('\n[uploadAttach:insert into submit_log]');
            console.log(insertResult);
            console.log();
            file.mv(path.join('media', hashedName), function (err) {
                if (err) {
                    // FIXME: error handling
                    throw err;
                }
            });
            res.sendStatus(202);
        }
    });
}
exports.uploadAttach = uploadAttach;
