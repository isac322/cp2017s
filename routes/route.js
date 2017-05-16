"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const webConfig = JSON.parse(fs.readFileSync('config/web.json', 'utf-8'));
const renderOption = {
    clientId: webConfig.google.clientId,
    assistants: webConfig.assistants,
    webManager: webConfig.web_manager,
    classPage: webConfig.class_page,
    shortName: webConfig.short_name,
    yearNSeason: webConfig.year_and_season
};
class BaseRoute {
    constructor() {
        this.title = 'SNU Computer Programming';
    }
    render(req, res, view) {
        res.locals.BASE_URL = '/';
        res.locals.originalTitle = this.title;
        res.locals.title = this.title + ' - ' + renderOption.shortName;
        res.locals.navPos = this.navPos;
        res.locals.signIn = req.session.signIn;
        res.locals.admin = req.session.admin;
        res.locals.name = req.session.name;
        return res.render(view, renderOption);
    }
}
exports.BaseRoute = BaseRoute;
