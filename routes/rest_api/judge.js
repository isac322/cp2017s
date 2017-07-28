"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const fs_ext = require("fs-extra");
const path = require("path");
const util = require("util");
const app_1 = require("../../app");
var ResultEnum;
(function (ResultEnum) {
    ResultEnum[ResultEnum["correct"] = 0] = "correct";
    ResultEnum[ResultEnum["incorrect"] = 1] = "incorrect";
    ResultEnum[ResultEnum["compileError"] = 2] = "compileError";
    ResultEnum[ResultEnum["timeout"] = 3] = "timeout";
    ResultEnum[ResultEnum["runtimeError"] = 4] = "runtimeError";
    ResultEnum[ResultEnum["scriptError"] = 5] = "scriptError";
    ResultEnum[ResultEnum["serverError"] = 6] = "serverError";
})(ResultEnum = exports.ResultEnum || (exports.ResultEnum = {}));
function runJudge(outputPath, sourcePath, inputPath, answerPath, callback) {
    app_1.docker.run('judge_server', ['sh', './judge.sh'], [{
            write: (message) => {
                app_1.logger.debug('[rest_api::runJudging::docker.stdout]');
                app_1.logger.debug(message.toString());
            }
        }, {
            write: (message) => {
                app_1.logger.error('[rest_api::runJudging::docker.stderr]');
                app_1.logger.error(message.toString());
            }
        }], {
        Volumes: {
            '/home/tester/source': {},
            '/home/tester/input': {},
            '/home/tester/output': {},
            '/home/tester/answer': {}
        },
        HostConfig: {
            Binds: [
                sourcePath + ':/home/tester/source:ro',
                inputPath + ':/home/tester/input:ro',
                outputPath + ':/home/tester/output:rw',
                answerPath + ':/home/tester/answer:ro'
            ]
        },
        Tty: false
    }, (err, data, container) => {
        if (err) {
            app_1.logger.error('[rest_api::judge::runJudge::docker_run] : ');
            app_1.logger.error(util.inspect(err, { showHidden: false }));
            return;
        }
        extractResult(outputPath, callback);
        fs_ext.remove(sourcePath, (err) => {
            if (err) {
                app_1.logger.error('[rest_api::runJudging::temp_remove] : ');
                app_1.logger.error(util.inspect(err, { showHidden: false }));
            }
        });
        container.remove();
    });
}
exports.runJudge = runJudge;
function extractResult(outputPath, callback) {
    const resultFile = path.join(outputPath, 'result.json');
    fs.exists(resultFile, (exists) => {
        if (exists) {
            fs.readFile(resultFile, 'UTF-8', (err, data) => {
                const result = JSON.parse(data);
                fs_ext.remove(outputPath, (err) => {
                    if (err) {
                        app_1.logger.error('[rest_api::extractResult::temp_remove] : ');
                        app_1.logger.error(util.inspect(err, { showHidden: false }));
                    }
                });
                let code;
                if (result.isMatched)
                    code = 0;
                else if ('returnCode' in result) {
                    if (result.returnCode == 124)
                        code = 3;
                    else
                        code = 4;
                }
                else
                    code = 1;
                callback(undefined, code, result);
            });
        }
        else {
            const errorLogFile = path.join(outputPath, 'error.log');
            fs.exists(errorLogFile, (exists) => {
                if (exists) {
                    fs.readFile(errorLogFile, 'UTF-8', (err, errorStr) => {
                        if (err) {
                            app_1.logger.error('[rest_api::extractResult::read_file] : ');
                            app_1.logger.error(util.inspect(err, { showHidden: false }));
                            callback({
                                name: err.name,
                                message: err.message,
                                stack: err.stack
                            }, 6);
                            return;
                        }
                        fs_ext.remove(outputPath, (err) => {
                            if (err) {
                                app_1.logger.error('[rest_api::extractResult::remove_file] : ');
                                app_1.logger.error(util.inspect(err, { showHidden: false }));
                            }
                        });
                        callback({
                            name: 'judging script error',
                            message: errorStr
                        }, 5, { isMatched: false, errorStr: errorStr });
                    });
                }
                else {
                    const compileErrorFile = path.join(outputPath, 'compile_error.log');
                    fs.exists(compileErrorFile, (exists) => {
                        if (exists) {
                            fs.readFile(compileErrorFile, 'UTF-8', (err, errorStr) => {
                                if (err) {
                                    app_1.logger.error('[rest_api::extractResult::read_file] : ');
                                    app_1.logger.error(util.inspect(err, { showHidden: false }));
                                    callback({
                                        name: err.name,
                                        message: err.message,
                                        stack: err.stack
                                    }, 6);
                                    return;
                                }
                                fs_ext.remove(outputPath, (err) => {
                                    if (err) {
                                        app_1.logger.error('[rest_api::extractResult::remove_file] : ');
                                        app_1.logger.error(util.inspect(err, { showHidden: false }));
                                    }
                                });
                                callback({
                                    name: 'compile error',
                                    message: errorStr
                                }, 5, { isMatched: false, errorStr: errorStr });
                            });
                        }
                        else {
                            app_1.logger.error('[rest_api::extractResult::something_else]');
                            callback({
                                name: 'unknown result',
                                message: 'can\'t recognize the type of result'
                            }, 6);
                        }
                    });
                }
            });
        }
    });
}
