"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var CLIENT_ID = "875872766577-t50bt5dsv9f6ua10a79r536m1b50b4h1.apps.googleusercontent.com";
var GoogleAuth = require('google-auth-library');
var auth = new GoogleAuth;
var OAuth2Client = new auth.OAuth2(CLIENT_ID, '', '');
var Client = require('mariasql');
var dbClient = new Client({
    host: 'localhost',
    user: 'cp2017s',
    password: 'dcs%%*#',
    db: 'cp2017s'
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
        var name = payload['name'];
        dbClient.query('SELECT * from email, user where email = "' + email + '" and user.student_id = email.student_id;', function (err, row) {
            if (err) {
                // FIXME: error handling
                throw err;
            }
            console.log(row.info);
            switch (row.info.numRows) {
                case '0':
                    res.status(404).send({ 'name': name, 'idToken': token });
                    break;
                case '1':
                    req.session.admin = row[0].is_admin == '1';
                    req.session.signIn = true;
                    req.session.name = decodeURIComponent(row[0].name);
                    res.status(202).send();
                    break;
                default:
                    res.status(500).send();
                    break;
            }
        });
    });
}
exports.signIn = signIn;
function signOut(req, res) {
    req.session.signIn = false;
    req.session.admin = false;
    res.status(202).send();
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
        dbClient.query('INSERT INTO user VALUES (\'' + studentId + '\', \'' + name + '\', 0, NOW()) ON DUPLICATE KEY UPDATE name=\'' + name + '\';', function (err, row) {
            if (err) {
                // FIXME: error handling
                throw err;
            }
            dbClient.query('INSERT INTO email VALUES ( \'' + studentId + '\', \'' + email + '\');', function (err, row) {
                if (err) {
                    // FIXME: error handling
                    throw err;
                }
                console.log(row);
                res.redirect('/');
            });
        });
    });
}
exports.register = register;
