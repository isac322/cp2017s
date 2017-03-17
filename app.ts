import * as bodyParser from "body-parser";
import * as cookieParser from "cookie-parser";
import * as express from "express";
import * as logger from "morgan";
import * as path from "path";
import * as expressSession from "express-session";
import * as Docker from "dockerode"
import {IndexRoute} from "./routes/index";
import {HWRoute} from "./routes/homework";
import {AttendanceRoute} from "./routes/attendance"
import {signIn, register, signOut, createHW, uploadAttach} from "./routes/rest_api";
import fileUpload = require('express-fileupload');

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
	 * @return {ng.auto.IInjectorService} Returns the newly created injector for this app.
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
		this.app.post('/homework', createHW);
		this.app.post('/homework/:attachId', uploadAttach);
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
		this.app.use(logger('dev'));
		this.app.use(fileUpload());
		this.app.use(bodyParser.json());
		this.app.use(bodyParser.urlencoded({extended: true}));
		this.app.use(cookieParser());
		this.app.use(require('less-middleware')(path.join(__dirname, 'public')));
		this.app.use(express.static(path.join(__dirname, 'public')));


		this.app.use('/js', express.static(path.join(__dirname, '/node_modules/bootstrap-validator/dist')));
		this.app.use('/js', express.static(path.join(__dirname, '/node_modules/bootstrap/dist/js')));
		this.app.use('/js', express.static(path.join(__dirname, '/node_modules/jquery/dist/')));
		this.app.use('/js', express.static(path.join(__dirname, '/node_modules/jquery-form/dist/')));
		this.app.use('/js', express.static(path.join(__dirname, '/res/js/')));
		this.app.use('/css', express.static(path.join(__dirname, '/node_modules/bootstrap/dist/css')));
		this.app.use('/css', express.static(path.join(__dirname, '/node_modules/font-awesome/css')));
		this.app.use('/css', express.static(path.join(__dirname, '/res/css')));
		this.app.use('/fonts', express.static(path.join(__dirname, '/node_modules/bootstrap/dist/fonts')));
		this.app.use('/fonts', express.static(path.join(__dirname, '/node_modules/font-awesome/fonts')));

		this.app.use(expressSession({
			secret: 'dcs%%*#',
			resave: false,
			saveUninitialized: true
		}));

		const docker = new Docker({host: 'http://localhost', port: 2375});

		docker.buildImage({
			context: path.join(__dirname, '/judge_server'),
			src: ['Dockerfile']
		}, {t: 'judge_server'}, (err, response) => {
			console.log(err);
		});
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
		AttendanceRoute.create(router);

		this.app.use(router);
	}
}