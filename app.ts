import * as bodyParser from "body-parser";
import * as cookieParser from "cookie-parser";
import * as express from "express";
import * as logger from "morgan";
import * as path from "path";
import * as errorHandler from "errorhandler";
import {IndexRoute} from "./routes/index";
import {LoginRoute} from "./routes/login";

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
		//empty for now
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
		this.app.use(bodyParser.json());
		this.app.use(bodyParser.urlencoded({extended: true}));
		this.app.use(cookieParser());
		this.app.use(require('less-middleware')(path.join(__dirname, 'public')));
		this.app.use(express.static(path.join(__dirname, 'public')));

		this.app.use('/js', express.static(path.join(__dirname, '/node_modules/bootstrap/dist/js')));
		this.app.use('/js', express.static(path.join(__dirname, '/node_modules/jquery/dist/')));
		this.app.use('/css', express.static(path.join(__dirname, '/node_modules/bootstrap/dist/css')));
		this.app.use('/fonts', express.static(path.join(__dirname, '/node_modules/bootstrap/dist/fonts')));

		// error handler
		this.app.use(function (err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
			// set locals, only providing error in development
			res.locals.message = err.message;
			res.locals.error = req.app.get('env') === 'development' ? err : {};

			// render the error page
			res.status(err.status || 500);
			res.render('error');
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
		LoginRoute.create(router);

		this.app.use(router);
	}
}