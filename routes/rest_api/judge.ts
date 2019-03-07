import * as fs_ext from 'fs-extra'
import * as path from 'path'

import {docker, logger} from '../../app'

export const enum ResultEnum {correct = 1, incorrect, compileError, timeout, runtimeError, scriptError, serverError}

export interface JudgeResult {
	type: ResultEnum
	failedIndex?: number
	returnCode?: number
	userOutput?: string
	runtimeError?: string
	scriptError?: string
	compileError?: string
}

export async function compileTest(outputPath: string, sourcePath: string): Promise<JudgeResult> {
	try {
		const container = await docker.run(
			'judge_server',
			['python3', 'judge.py', '--compile-only'],
			// @ts-ignore
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
					'/home/tester/output': {}
				},
				HostConfig: {
					Binds: [
						sourcePath + ':/home/tester/source:ro',
						outputPath + ':/home/tester/output:rw'
					]
				},
				Tty: false
			});

		// remove input temporary folder
		fs_ext.remove(sourcePath, (err: Error) => {
			if (err) logger.error('[rest_api::runJudging::temp_remove] : ', err.stack);
		});

		await container.remove();

		return await extractResult(outputPath);
	}
	catch (err) {
		logger.error('[rest_api::judge::runJudge::docker_run] : ', err.stack);
		return {type: ResultEnum.serverError};
	}
}

export async function runJudge(outputPath: string, sourcePath: string,
							   inputPath: string, answerPath: string): Promise<JudgeResult> {
	try {
		const container = await docker.run(
			'judge_server',
			['python3', 'judge.py'],
			// @ts-ignore
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
			});

		// remove input temporary folder
		fs_ext.remove(sourcePath, (err: Error) => {
			if (err) logger.error('[rest_api::runJudging::temp_remove] : ', err.stack);
		});

		await container.remove();

		return await extractResult(outputPath);
	}
	catch (err) {
		logger.error('[rest_api::judge::runJudge::docker_run] : ', err.stack);
		return {type: ResultEnum.serverError};
	}
}

async function extractResult(outputPath: string): Promise<JudgeResult> {
	const resultFile = path.join(outputPath, 'result.json');

	if (await fs_ext.pathExists(resultFile)) {
		const data = await fs_ext.readFile(resultFile, 'UTF-8');

		fs_ext.remove(outputPath, (err: Error) => {
			if (err) logger.error('[rest_api::extractResult::temp_remove] : ', err.stack);
		});

		return JSON.parse(data);
	}
	else {
		logger.error('[rest_api::extractResult::something_else] : result file does not exists.');
		return {type: ResultEnum.serverError};
	}
}