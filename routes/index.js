"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("../app");
const route_1 = require("./route");
class IndexRoute extends route_1.default {
    constructor() {
        super();
        this.navPos = 1;
    }
    static create(router) {
        app_1.logger.debug('[IndexRoute::create] Creating index route.');
        router.get('/', (req, res, next) => {
            new IndexRoute().index(req, res, next);
        });
    }
    index(req, res, next) {
        this.title = 'SNU Computer Programming';
        this.render(req, res, 'index');
    }
}
exports.IndexRoute = IndexRoute;
