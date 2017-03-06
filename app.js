"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var express = require("express");
var logger = require("morgan");
var path = require("path");
var expressSession = require("express-session");
var index_1 = require("./routes/index");
var homework_1 = require("./routes/homework");
var rest_api_1 = require("./routes/rest_api");
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
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(cookieParser());
        this.app.use(require('less-middleware')(path.join(__dirname, 'public')));
        this.app.use(express.static(path.join(__dirname, 'public')));
        this.app.use('/js', express.static(path.join(__dirname, '/node_modules/bootstrap-validator/dist')));
        this.app.use('/js', express.static(path.join(__dirname, '/node_modules/bootstrap/dist/js')));
        this.app.use('/js', express.static(path.join(__dirname, '/node_modules/jquery/dist/')));
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
        // error handler
        this.app.use(function (err, req, res, next) {
            // set locals, only providing error in development
            res.locals.message = err.message;
            res.locals.error = req.app.get('env') === 'development' ? err : {};
            // render the error page
            res.status(err.status || 500);
            res.render('error');
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
        this.app.use(router);
    };
    return Server;
}());
exports.Server = Server;
