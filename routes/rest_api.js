"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mysql = require("mysql");
var CLIENT_ID = "875872766577-t50bt5dsv9f6ua10a79r536m1b50b4h1.apps.googleusercontent.com";
var GoogleAuth = require('google-auth-library');
var auth = new GoogleAuth;
var OAuth2Client = new auth.OAuth2(CLIENT_ID, '', '');
/*
 const Client = require('mariasql');

 const dbClient = new Client({
 host: 'localhost',
 user: 'cp2017s',
 password: 'dcs%%*#',
 db: 'cp2017s'
 });*/
var dbClient = mysql.createConnection({
    host: 'localhost',
    user: 'cp2017s',
    password: 'dcs%%*#',
    database: 'cp2017s'
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
        dbClient.query('SELECT * from email, user where email = "' + email + '" and user.student_id = email.student_id;', function (err, result) {
            if (err) {
                // FIXME: error handling
                throw err;
            }
            console.log('[signIn]');
            console.log(result);
            console.log();
            switch (result.length) {
                case 0:
                    res.sendStatus(404);
                    break;
                case 1:
                    req.session.admin = result[0].is_admin == '1';
                    req.session.signIn = true;
                    req.session.name = decodeURIComponent(result[0].name);
                    req.session.student_id = result[0].student_id;
                    req.session.email = email;
                    res.sendStatus(202);
                    break;
                default:
                    res.sendStatus(500);
                    break;
            }
        });
    });
}
exports.signIn = signIn;
function signOut(req, res) {
    req.session.signIn = false;
    req.session.admin = false;
    res.sendStatus(202);
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
        dbClient.query('SELECT * FROM user WHERE student_id=\'' + studentId + '\';', function (err, selectResult) {
            if (err || selectResult.length != 1) {
                // FIXME: error handling
                throw err;
            }
            console.log('[register:outer]');
            console.log(selectResult);
            console.log();
            dbClient.query('INSERT INTO email VALUES (?,?,?);', [studentId, email, nameInGoogle], function (err, insertResult) {
                if (err) {
                    // FIXME: error handling
                    throw err;
                }
                console.log('[register:inner]');
                console.log(insertResult);
                console.log();
                req.session.signIn = true;
                req.session.name = decodeURIComponent(selectResult[0].name);
                req.session.student_id = selectResult[0].student_id;
                req.session.email = email;
                req.session.admin = selectResult[0].is_admin == '1';
                res.redirect('/');
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
        res.redirect('/homework');
    }
    else {
        var name_1 = encodeURIComponent(req.body.name);
        var start_date = req.body.start;
        var end_date = req.body.due;
        var description = req.body.description;
        dbClient.query('INSERT INTO homework(name, start_date, end_date, author_id, description) VALUES(?,?,?,?,?);', [name_1, start_date, end_date, req.session.student_id, description], function (err, insertResult) {
            if (err) {
                // FIXME: error handling
                throw err;
            }
            console.log('[createHW:insert into homework]');
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
            console.log(values);
            dbClient.query('INSERT INTO hw_config(homework_id, name, extension) VALUES ' + mysql.escape(values) + ';', function (err, result) {
                if (err) {
                    // FIXME: error handling
                    throw err;
                }
                console.log('[createHW:insert into hw_config]');
                console.log(result);
            });
        });
        res.redirect('/homework');
    }
}
exports.createHW = createHW;
