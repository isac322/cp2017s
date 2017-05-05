"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const express = require("express");
const expressSession = require("express-session");
const fs_ext = require("fs-extra");
const morgan = require("morgan");
const path = require("path");
const util = require("util");
const winston = require("winston");
const exercise_1 = require("./routes/exercise");
const homework_1 = require("./routes/homework");
const index_1 = require("./routes/index");
const profile_1 = require("./routes/profile");
const fs = require("fs");
const history_1 = require("./routes/history");
const board_1 = require("./routes/board");
const project_1 = require("./routes/project");
const identification_1 = require("./routes/rest_api/identification");
const homework_2 = require("./routes/rest_api/homework");
const history_2 = require("./routes/rest_api/history");
const exercise_2 = require("./routes/rest_api/exercise");
const project_2 = require("./routes/rest_api/project");
const fileUpload = require('express-fileupload');
require('winston-daily-rotate-file');
const Docker = require("dockerode");
const dockerConfig = JSON.parse(fs.readFileSync('config/docker.json', 'utf-8'));
exports.docker = new Docker(dockerConfig);
exports.tempPath = path.join(__dirname, 'media', 'tmp');
exports.exerciseSetPath = path.join(__dirname, 'media', 'test_set', 'exercise');
exports.submittedExercisePath = path.join(__dirname, 'media', 'exercise');
exports.submittedExerciseOriginalPath = path.join(__dirname, 'media', 'exercise_origin');
exports.submittedHomeworkPath = path.join(__dirname, 'media', 'homework');
exports.submittedProjectPath = path.join(__dirname, 'media', 'project');
const logPath = path.join(__dirname, 'logs');
const requiredPath = [exports.tempPath, exports.exerciseSetPath, exports.submittedHomeworkPath, exports.submittedExercisePath,
    exports.submittedExerciseOriginalPath, exports.submittedProjectPath, logPath];
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
class Server {
    static bootstrap() {
        return new Server();
    }
    constructor() {
        this.app = express();
        this.createDir();
        this.config();
        this.routes();
        this.api();
    }
    api() {
        this.app.post('/signin', identification_1.signIn);
        this.app.post('/register', identification_1.register);
        this.app.post('/signout', identification_1.signOut);
        this.app.post('/homework', homework_2.createHomework);
        this.app.get('/homework/name', homework_2.checkHomeworkName);
        this.app.get('/homework/:logId([0-9]+)', homework_2.downloadSubmittedHomework);
        this.app.post('/homework/:attachId([0-9]+)', homework_2.uploadHomework);
        this.app.get('/exercise/:logId([0-9]+)', exercise_2.downloadSubmittedExercise);
        this.app.get('/exercise/resolve', exercise_2.resolveUnhandled);
        this.app.get('/exercise/result/:logId([0-9]+)', exercise_2.fetchJudgeResult);
        this.app.post('/exercise/:attachId([0-9]+)', exercise_2.uploadExercise);
        this.app.get('/history/list', history_2.historyList);
        this.app.get('/project/name', project_2.checkProjectName);
        this.app.post('/project', project_2.createProject);
        this.app.get('/project/:logId([0-9]+)', project_2.downloadSubmittedProject);
        this.app.post('/project/:attachId([0-9]+)', project_2.uploadProject);
    }
    config() {
        this.app.set('views', path.join(__dirname, 'views'));
        this.app.set('view engine', 'pug');
        this.app.use(morgan('dev', {
            stream: {
                write: (message) => {
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
        this.app.use('/js', express.static(path.join(__dirname, 'res', 'js')));
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
        }, (err) => {
            if (err) {
                exports.logger.error(err);
            }
        });
    }
    routes() {
        let router = express.Router();
        index_1.IndexRoute.create(router);
        homework_1.HWRoute.create(router);
        exercise_1.ExerciseRoute.create(router);
        project_1.ProjectRoute.create(router);
        history_1.HistoryRoute.create(router);
        board_1.BoardRoute.create(router);
        profile_1.ProfileRoute.create(router);
        this.app.use(router);
    }
    createDir() {
        for (const path of requiredPath) {
            fs_ext.mkdirp(path, (err) => {
                if (err) {
                    exports.logger.error(util.inspect(err, { showHidden: false, depth: 1 }));
                }
            });
        }
    }
}
exports.Server = Server;
//# sourceMappingURL=app.js.map