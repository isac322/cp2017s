"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("../app");
const route_1 = require("./route");
class BoardRoute extends route_1.default {
    constructor() {
        super();
        this.navPos = 6;
    }
    static create(router) {
        app_1.logger.debug('[BoardRoute::create] Creating board route.');
        router.get('/board', (req, res, next) => {
            new BoardRoute().board(req, res, next);
        });
    }
    board(req, res, next) {
        this.title = 'Web board';
        if (!req.session.signIn) {
            return res.redirect('/');
        }
        this.render(req, res, 'board');
    }
}
exports.BoardRoute = BoardRoute;
