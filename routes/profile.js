"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("../app");
const route_1 = require("./route");
class ProfileRoute extends route_1.default {
    constructor() {
        super();
        this.navPos = 99;
    }
    static create(router) {
        app_1.logger.debug('[ProfileRoute::create] Creating profile route.');
        router.get('/profile', (req, res, next) => {
            new ProfileRoute().profile(req, res, next);
        });
    }
    profile(req, res, next) {
        this.title = 'Profile';
        if (!req.session.signIn) {
            return res.redirect('/');
        }
        this.render(req, res, 'profile');
    }
}
exports.ProfileRoute = ProfileRoute;
