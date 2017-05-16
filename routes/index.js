"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const route_1 = require("./route");
const app_1 = require("../app");
class IndexRoute extends route_1.BaseRoute {
    static create(router) {
        app_1.logger.debug('[IndexRoute::create] Creating index route.');
        router.get('/', (req, res, next) => {
            new IndexRoute().index(req, res, next);
        });
    }
    constructor() {
        super();
        this.navPos = 1;
    }
    index(req, res, next) {
        this.title = 'SNU Computer Programming';
        this.render(req, res, 'index');
    }
}
exports.IndexRoute = IndexRoute;
