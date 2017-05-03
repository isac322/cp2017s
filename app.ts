import * as bodyParser from "body-parser";
import * as cookieParser from "cookie-parser";
import * as express from "express";
import * as expressSession from "express-session";
import * as fs_ext from "fs-extra";
import * as morgan from "morgan";
import * as path from "path";
import * as util from "util";
import * as  winston from "winston";
import {ExerciseRoute} from "./routes/exercise";
import {HWRoute} from "./routes/homework";
import {IndexRoute} from "./routes/index";
import {ProfileRoute} from "./routes/profile";
import * as fs from "fs";
import {HistoryRoute} from "./routes/history";
import {BoardRoute} from "./routes/board";
import {ProjectRoute} from "./routes/project";
import {register, signIn, signOut} from "./routes/rest_api/identification";
import {createHomework, downloadSubmittedHomework, checkHomeworkName, uploadHomework} from "./routes/rest_api/homework";
import {historyList} from "./routes/rest_api/history";
import {downloadSubmittedExercise, fetchJudgeResult, resolveUnhandled, uploadExercise} from "./routes/rest_api/exercise";
import {createProject, checkProjectName, uploadProject} from "./routes/rest_api/project";
import fileUpload = require('express-fileupload')

require('winston-daily-rotate-file');

const Docker = require("dockerode");


const dockerConfig = JSON.parse(fs.readFileSync('config/docker.json', 'utf-8'));
export const docker = new Docker(dockerConfig);

export const tempPath = path.join(__dirname, 'media', 'tmp');
export const exerciseSetPath = path.join(__dirname, 'media', 'test_set', 'exercise');

export const submittedExercisePath = path.join(__dirname, 'media', 'exercise');
export const submittedExerciseOriginalPath = path.join(__dirname, 'media', 'exercise_origin');
export const submittedHomeworkPath = path.join(__dirname, 'media', 'homework');
export const submittedProjectPath = path.join(__dirname, 'media', 'project');

const logPath = path.join(__dirname, 'logs');

const requiredPath = [tempPath, exerciseSetPath, submittedHomeworkPath, submittedExercisePath,
	submittedExerciseOriginalPath, submittedProjectPath, logPath];


export const logger = new winston.Logger({
	transports: [
		new winston.transports.DailyRotateFile({
			filename: path.join(logPath, 'log-'), // this path needs to be absolute
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
export class Server {

	public app: express.Application;

	/**
	 * Bootstrap the application.
	 *
	 * @class Server
	 * @method bootstrap
	 * @static
	 * @return {Server} Returns the newly created injector for this app.
	 */
	public static bootstrap(): Server {
		return new Server();
	}

	/**
	 * Constructor.
	 *
	 * @class Server
	 * @constructor
	 */
	constructor() {
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
	 * Create REST API routes
	 *
	 * @class Server
	 * @method api
	 */
	public api() {
		this.app.post('/signin', signIn);
		this.app.post('/register', register);
		this.app.post('/signout', signOut);
		this.app.post('/homework', createHomework);
		this.app.get('/homework/name', checkHomeworkName);
		this.app.get('/homework/:logId([0-9]+)', downloadSubmittedHomework);
		this.app.post('/homework/:attachId([0-9]+)', uploadHomework);
		this.app.get('/exercise/:logId([0-9]+)', downloadSubmittedExercise);
//		this.app.post('/exercise', createExercise);
		this.app.get('/exercise/resolve', resolveUnhandled);
		this.app.get('/exercise/result/:logId([0-9]+)', fetchJudgeResult);
		this.app.post('/exercise/:attachId([0-9]+)', uploadExercise);
		this.app.get('/history/list', historyList);
		this.app.get('/project/name', checkProjectName);
		this.app.post('/project', createProject);
		this.app.post('/project/:attachId([0-9]+)', uploadProject);
	}

	/**
	 * Configure application
	 *
	 * @class Server
	 * @method config
	 */
	public config() {
		// view engine setup
		this.app.set('views', path.join(__dirname, 'views'));
		this.app.set('view engine', 'pug');

		// uncomment after placing your favicon in /public
		//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
		this.app.use(morgan('dev', {
			stream: {
				write: (message: string) => {
					logger.info(message.trim());
				}
			}
		}));
		this.app.use(fileUpload());
		this.app.use(bodyParser.json());
		this.app.use(bodyParser.urlencoded({extended: true}));
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

		docker.buildImage(
			{
				context: path.join(__dirname, 'judge_server'),
				src: ['Dockerfile', 'compare.py', 'judge.sh']
			},
			{
				t: 'judge_server',
				buildargs: {uid: process.getuid().toString()}
			},
			(err) => {
				if (err) {
					// TODO: error handling
					logger.error(err);
				}
			}
		);
	}

	/**
	 * Create router
	 *
	 * @class Server
	 * @method api
	 */
	public routes() {
		let router: express.Router = express.Router();

		IndexRoute.create(router);
		HWRoute.create(router);
		ExerciseRoute.create(router);
		ProjectRoute.create(router);
		HistoryRoute.create(router);
		BoardRoute.create(router);
		ProfileRoute.create(router);

		this.app.use(router);
	}


	/**
	 * Create required directories
	 */
	public createDir() {
		for (const path of requiredPath) {
			fs_ext.mkdirp(path, (err: Error) => {
				if (err) {
					// TODO: error handling
					logger.error(util.inspect(err, {showHidden: false, depth: 1}));
				}
			});
		}
	}
}
