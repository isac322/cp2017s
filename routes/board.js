"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const route_1 = require("./route");
const app_1 = require("../app");
class BoardRoute extends route_1.BaseRoute {
    static create(router) {
        app_1.logger.debug('[BoardRoute::create] Creating board route.');
        router.get('/board', (req, res, next) => {
            new BoardRoute().board(req, res, next);
        });
    }
    constructor() {
        super();
        this.navPos = 6;
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
//# sourceMappingURL=board.js.map