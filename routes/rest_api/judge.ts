import * as fs_ext from "fs-extra";
import * as util from "util";
import {docker, logger} from "../../app";
import * as path from "path";
import * as fs from "fs";

export interface JudgeResult {
	isMatched: boolean,
	errorLog?: string,
	returnCode?: number,
	inputIndex?: number,
	userOutput?: string,
	errorStr?: string
}

export const enum ResultEnum {correct, incorrect, compileError, timeout, runtimeError, scriptError, serverError}

export function runJudge(outputPath: string, sourcePath: string, inputPath: string, answerPath: string,
						 callback: (err: Error, code: ResultEnum, data?: JudgeResult) => void): void {
	docker.run(
		'judge_server',
		['sh', './judge.sh'],
		[{
			write: (message: Buffer) => {
				logger.debug('[rest_api::runJudging::docker.stdout]');
				logger.debug(message.toString());
			}
		}, {
			write: (message: Buffer) => {
				logger.error('[rest_api::runJudging::docker.stderr]');
				logger.error(message.toString());
			}
		}],
		{
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
		},
		(err: any, data: any, container: any) => {
			if (err) {
				logger.error('[rest_api::judge::runJudge::docker_run] : ');
				logger.error(util.inspect(err, {showHidden: false}));
				return;
			}

			extractResult(outputPath, callback);

			// remove input temporary folder
			fs_ext.remove(sourcePath, (err: Error) => {
				if (err) {
					logger.error('[rest_api::runJudging::temp_remove] : ');
					logger.error(util.inspect(err, {showHidden: false}));
				}
			});

			container.remove();
		});
}

function extractResult(outputPath: string, callback: (err: Error, code: ResultEnum, data?: JudgeResult) => void): void {
	const resultFile = path.join(outputPath, 'result.json');

	fs.exists(resultFile, (exists: boolean) => {
		// if result.js is exist, it means that this judge was successful or runtime exceptions or timeout occur
		if (exists) {
			fs.readFile(resultFile, 'UTF-8', (err: NodeJS.ErrnoException, data: string) => {
				const result: JudgeResult = JSON.parse(data);

				// remove output temporary folder
				fs_ext.remove(outputPath, (err: Error) => {
					if (err) {
						logger.error('[rest_api::extractResult::temp_remove] : ');
						logger.error(util.inspect(err, {showHidden: false}));
					}
				});

				let code: ResultEnum;

				// the judge was correct
				if (result.isMatched) code = ResultEnum.correct;

				// or if runtime exceptions or timeout occur
				else if ('returnCode' in result) {
					// timeout
					if (result.returnCode == 124) code = ResultEnum.timeout;
					// runtime error
					else code = ResultEnum.runtimeError
				}

				// or it was incorrect
				else code = ResultEnum.incorrect;

				callback(undefined, code, result)
			});
		}

		// or it can be compile error or run command error or internal server error
		else {
			const errorLogFile = path.join(outputPath, 'error.log');

			fs.exists(errorLogFile, (exists: boolean) => {
				// script error
				if (exists) {
					fs.readFile(errorLogFile, 'UTF-8', (err: NodeJS.ErrnoException, errorStr: string) => {
						if (err) {
							logger.error('[rest_api::extractResult::read_file] : ');
							logger.error(util.inspect(err, {showHidden: false}));

							callback({
								name: err.name,
								message: err.message,
								stack: err.stack
							}, ResultEnum.serverError);
							return;
						}

						// remove output temporary folder
						fs_ext.remove(outputPath, (err: Error) => {
							if (err) {
								logger.error('[rest_api::extractResult::remove_file] : ');
								logger.error(util.inspect(err, {showHidden: false}));
							}
						});

						callback({
							name: 'judging script error',
							message: errorStr
						}, ResultEnum.scriptError, {isMatched: false, errorStr: errorStr});
					});
				}
				else {
					const compileErrorFile = path.join(outputPath, 'compile_error.log');

					fs.exists(compileErrorFile, (exists: boolean) => {
						// compile error
						if (exists) {
							fs.readFile(compileErrorFile, 'UTF-8', (err: NodeJS.ErrnoException, errorStr: string) => {
								if (err) {
									logger.error('[rest_api::extractResult::read_file] : ');
									logger.error(util.inspect(err, {showHidden: false}));

									callback({
										name: err.name,
										message: err.message,
										stack: err.stack
									}, ResultEnum.serverError);
									return;
								}

								// remove output temporary folder
								fs_ext.remove(outputPath, (err: Error) => {
									if (err) {
										logger.error('[rest_api::extractResult::remove_file] : ');
										logger.error(util.inspect(err, {showHidden: false}));
									}
								});

								callback({
									name: 'compile error',
									message: errorStr
								}, ResultEnum.scriptError, {isMatched: false, errorStr: errorStr});
							})
						}

						// something else
						else {
							logger.error('[rest_api::extractResult::something_else]');
							callback({
								name: 'unknown result',
								message: 'can\'t recognize the type of result'
							}, ResultEnum.serverError);
						}
					});
				}
			});
		}
	});
}