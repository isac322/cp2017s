"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var express = require("express");
var expressSession = require("express-session");
var fs_ext = require("fs-extra");
var logger = require("morgan");
var path = require("path");
var exercise_1 = require("./routes/exercise");
var homework_1 = require("./routes/homework");
var index_1 = require("./routes/index");
var rest_api_1 = require("./routes/rest_api");
var fileUpload = require("express-fileupload");
var Docker = require("dockerode");
exports.docker = new Docker({ host: 'http://localhost', port: 2375 });
exports.tempPath = path.join(__dirname, 'media', 'tmp');
exports.exerciseSetPath = path.join(__dirname, 'media', 'test_set', 'exercise');
exports.submittedExercisePath = path.join(__dirname, 'media', 'exercise');
exports.submittedHomeworkPath = path.join(__dirname, 'media', 'homework');
/**
 * The server.
 *
 * @class Server
 */
var Server = (function () {
    /**
     * Constructor.
     *
     * @class Server
     * @constructor
     */
    function Server() {
        //create expressjs application
        this.app = express();
        //configure application
        this.config();
        //add routes
        this.routes();
        //add api
        this.api();
        this.createDir();
    }
    /**
     * Bootstrap the application.
     *
     * @class Server
     * @method bootstrap
     * @static
     * @return {ng.auto.IInjectorService} Returns the newly created injector for this app.
     */
    Server.bootstrap = function () {
        return new Server();
    };
    /**
     * Create REST API routes
     *
     * @class Server
     * @method api
     */
    Server.prototype.api = function () {
        this.app.post('/signin', rest_api_1.signIn);
        this.app.post('/register', rest_api_1.register);
        this.app.post('/signout', rest_api_1.signOut);
        this.app.post('/homework', rest_api_1.createHW);
        this.app.get('/homework/name', rest_api_1.hwNameChecker);
        this.app.post('/homework/:attachId', rest_api_1.uploadAttach);
        this.app.post('/exercise', rest_api_1.runExercise);
        this.app.post('/exercise/:attachId', rest_api_1.runExercise);
    };
    /**
     * Configure application
     *
     * @class Server
     * @method config
     */
    Server.prototype.config = function () {
        // view engine setup
        this.app.set('views', path.join(__dirname, 'views'));
        this.app.set('view engine', 'pug');
        // uncomment after placing your favicon in /public
        //app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
        this.app.use(logger('dev'));
        this.app.use(fileUpload());
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(cookieParser());
        this.app.use(require('less-middleware')(path.join(__dirname, 'public')));
        this.app.use(express.static(path.join(__dirname, 'public')));
        this.app.use('/js', express.static(path.join(__dirname, 'node_modules', 'bootstrap-validator', 'dist')));
        this.app.use('/js', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist', 'js')));
        this.app.use('/js', express.static(path.join(__dirname, 'node_modules', 'jquery', 'dist', '')));
        this.app.use('/js', express.static(path.join(__dirname, 'node_modules', 'jquery-form', 'dist', '')));
        this.app.use('/js', express.static(path.join(__dirname, 'res', 'js', '')));
        this.app.use('/css', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist', 'css')));
        this.app.use('/css', express.static(path.join(__dirname, 'node_modules', 'font-awesome', 'css')));
        this.app.use('/css', express.static(path.join(__dirname, 'res', 'css')));
        this.app.use('/fonts', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist', 'fonts')));
        this.app.use('/fonts', express.static(path.join(__dirname, 'node_modules', 'font-awesome', 'fonts')));
        this.app.use(expressSession({
            secret: 'dcs%%*#',
            resave: false,
            saveUninitialized: true
        }));
        exports.docker.buildImage({
            context: path.join(__dirname, 'judge_server'),
            src: ['Dockerfile']
        }, { t: 'judge_server' }, function (err, response) {
            if (err) {
                console.log(err);
            }
            console.log(response.statusCode, response.statusMessage);
        });
    };
    /**
     * Create router
     *
     * @class Server
     * @method api
     */
    Server.prototype.routes = function () {
        var router = express.Router();
        index_1.IndexRoute.create(router);
        homework_1.HWRoute.create(router);
        exercise_1.ExerciseRoute.create(router);
        this.app.use(router);
    };
    /**
     * Create directories
     */
    Server.prototype.createDir = function () {
        fs_ext.mkdirp(exports.tempPath, function (err) {
            if (err) {
                // TODO: error handling
                console.error(err);
            }
        });
        fs_ext.mkdirp(exports.exerciseSetPath, function (err) {
            if (err) {
                // TODO: error handling
                console.error(err);
            }
        });
        fs_ext.mkdirp(exports.submittedExercisePath, function (err) {
            if (err) {
                // TODO: error handling
                console.error(err);
            }
        });
        fs_ext.mkdirp(exports.submittedHomeworkPath, function (err) {
            if (err) {
                // TODO: error handling
                console.error(err);
            }
        });
    };
    return Server;
}());
exports.Server = Server;
