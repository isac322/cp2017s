"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var express = require("express");
var expressSession = require("express-session");
var fs_ext = require("fs-extra");
var morgan = require("morgan");
var path = require("path");
var util = require("util");
var winston = require("winston");
var exercise_1 = require("./routes/exercise");
var homework_1 = require("./routes/homework");
var index_1 = require("./routes/index");
var rest_api_1 = require("./routes/rest_api");
var profile_1 = require("./routes/profile");
var fs = require("fs");
var fileUpload = require("express-fileupload");
var history_1 = require("./routes/history");
require('winston-daily-rotate-file');
var Docker = require("dockerode");
var dockerConfig = JSON.parse(fs.readFileSync('config/docker.json', 'utf-8'));
exports.docker = new Docker(dockerConfig);
exports.tempPath = path.join(__dirname, 'media', 'tmp');
exports.exerciseSetPath = path.join(__dirname, 'media', 'test_set', 'exercise');
exports.submittedExercisePath = path.join(__dirname, 'media', 'exercise');
exports.submittedExerciseOriginalPath = path.join(__dirname, 'media', 'exercise_origin');
exports.submittedHomeworkPath = path.join(__dirname, 'media', 'homework');
var logPath = path.join(__dirname, 'logs');
var requiredPath = [exports.tempPath, exports.exerciseSetPath, exports.submittedHomeworkPath, exports.submittedExercisePath,
    exports.submittedExerciseOriginalPath, logPath];
exports.logger = new winston.Logger({
    transports: [
        new winston.transports.DailyRotateFile({
            filename: path.join(logPath, 'log-'),
            datePattern: 'yyyy-MM-dd.log',
            colorize: true,
            json: false,
            timestamp: true,
            localTime: true,
            maxFiles: 50,
            level: 'debug'
        })
    ]
});
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
        this.createDir();
        //configure application
        this.config();
        //add routes
        this.routes();
        //add api
        this.api();
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
        this.app.use(morgan('dev', {
            stream: {
                write: function (message) {
                    exports.logger.info(message.trim());
                }
            }
        }));
        this.app.use(fileUpload());
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(cookieParser());
        this.app.use('/js', express.static(path.join(__dirname, 'node_modules', 'bootstrap-validator', 'dist')));
        this.app.use('/js', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist', 'js')));
        this.app.use('/js', express.static(path.join(__dirname, 'node_modules', 'jquery', 'dist')));
        this.app.use('/js', express.static(path.join(__dirname, 'node_modules', 'jquery-form', 'dist')));
        this.app.use('/js', express.static(path.join(__dirname, 'node_modules', 'bootstrap-select', 'dist', 'js')));
        this.app.use('/js', express.static(path.join(__dirname, 'res', 'js', '')));
        this.app.use('/css', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist', 'css')));
        this.app.use('/css', express.static(path.join(__dirname, 'node_modules', 'font-awesome', 'css')));
        this.app.use('/css', express.static(path.join(__dirname, 'node_modules', 'bootstrap-select', 'dist', 'css')));
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
            src: ['Dockerfile', 'compare.py', 'judge.sh']
        }, {
            t: 'judge_server',
            buildargs: { uid: process.getuid().toString() }
        }, function (err, response) {
            if (err) {
                // TODO: error handling
                exports.logger.error(err);
            }
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
        profile_1.ProfileRoute.create(router);
        history_1.HistoryRoute.create(router);
        this.app.use(router);
    };
    /**
     * Create required directories
     */
    Server.prototype.createDir = function () {
        for (var _i = 0, requiredPath_1 = requiredPath; _i < requiredPath_1.length; _i++) {
            var path_1 = requiredPath_1[_i];
            fs_ext.mkdirp(path_1, function (err) {
                if (err) {
                    // TODO: error handling
                    exports.logger.error(util.inspect(err, { showHidden: false, depth: 1 }));
                }
            });
        }
    };
    return Server;
}());
exports.Server = Server;
