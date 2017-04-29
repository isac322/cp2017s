"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var app_1 = require("../../app");
var mysql_1 = require("mysql");
var fs = require("fs");
var util = require("util");
var webConfig = JSON.parse(fs.readFileSync('config/web.json', 'utf-8'));
var CLIENT_ID = webConfig.google.clientId;
var GoogleAuth = require('google-auth-library');
var auth = new GoogleAuth;
var OAuth2Client = new auth.OAuth2(CLIENT_ID, '', '');
var dbConfig = JSON.parse(fs.readFileSync('config/database.json', 'utf-8'));
var dbClient = mysql_1.createConnection({
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
        dbClient.query('SELECT * from email, user where email = "' + email + '" and user.student_id = email.student_id;', function (err, result) {
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
        dbClient.query('SELECT * FROM user WHERE student_id = \'' + studentId + '\';', function (err, selectResult) {
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
            dbClient.query('INSERT INTO email VALUES (?,?,?);', [studentId, email, nameInGoogle], function (err, insertResult) {
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
