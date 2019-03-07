import * as archiver from 'archiver'
import * as crypto from 'crypto'
import {Request, Response} from 'express'
import {UploadedFile} from 'express-fileupload'
import * as fs_ext from 'fs-extra'
import * as fs from 'fs'
import * as iconv from 'iconv-lite'
import * as multiparty from 'multiparty'
import * as path from 'path'
import {parse as qsParse} from 'qs'
import {QueryTypes, Transaction} from 'sequelize'
import * as typeIs from 'type-is'

import {
	exerciseSetPath,
	logger,
	submittedExerciseOriginalPath,
	submittedExercisePath,
	submittedHomeworkPath,
	TEMP_PATH
} from '../../app'
import {exerciseEntryInstance, exerciseGroupInstance} from '../../models/db'
import db, {sequelize} from '../../models/index'
import {compileTest, JudgeResult, ResultEnum, runJudge} from './judge'

const charsetDetector = require('jschardet');


function onData(name: string, val: any, data: any): void {
	if (Array.isArray(data[name])) {
		data[name].push(val);
	}
	else if (data[name]) {
		data[name] = [data[name], val];
	}
	else {
		data[name] = val;
	}
}

interface EntryInfo {
	name: string
	extension: string
}

interface GroupInfo {
	subtitle: string
	type: string
	timeLimit: string
	entryPoint?: string
	compileOnly?: 'on'
	throughStdin?: 'on'
	throughArg?: 'on'
	entries: EntryInfo[]
}

interface GroupFile {
	stdInput?: any[]
	stdOutput?: any[]
	argInput?: any[]
	argOutput?: any[]
}


async function insertGroupAndEntries(exerciseId: number, groupInfo: GroupInfo,
									 testSetLength: number, transaction: Transaction): Promise<void> {
	const insertedGroup = await db.exerciseGroup.create({
		exerciseId: exerciseId,
		id: undefined,
		compileType: groupInfo.type,
		inputThroughArg: !!groupInfo.throughArg,
		inputThroughStdin: !!groupInfo.throughStdin,
		compileOnly: !!groupInfo.compileOnly,
		subtitle: groupInfo.subtitle,
		testSetSize: testSetLength,
		timeLimit: parseInt(groupInfo.timeLimit),
		entryPoint: groupInfo.entryPoint
	}, {transaction: transaction});

	await db.exerciseEntry.bulkCreate(groupInfo.entries.map(value => ({
		id: undefined,
		groupId: insertedGroup.id,
		name: value.name,
		extension: value.extension
	})), {transaction: transaction});
}


/**
 * creating a new project request api.
 *
 * @method create
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export async function create(req: Request, res: Response) {
	if (!req.session.admin || !typeIs(req, 'multipart/form-data')) return res.sendStatus(401);

	const form = new multiparty.Form();
	const data: any = {};
	const files: any = {};

	form.on('field', (name, val) => onData(name, val, data));
	form.on('file', (name, val) => onData(name, val, files));

	form.on('error', err => {
		err.status = 400;

		// TODO: error handling

		console.error(err);

		req.resume();
	});

	form.on('close', async () => {
		try {
			const body: {
				name: string
				start: Date
				due: Date
				onlyForAdmin?: 'on'
				groups: GroupInfo[]
				descriptions?: string[]
			} = qsParse(data);

			const file: {
				groups?: { [groupdId: string]: GroupFile }
			} = qsParse(files, {parseArrays: false});

			const insertedExercise = await db.exercise.create({
				name: body.name,
				startDate: new Date(body.start),
				endDate: new Date(body.due),
				authorId: req.session.studentId,
				authorEmail: req.session.email,
				id: undefined,
				isAdminOnly: !!body.onlyForAdmin,
				created: undefined
			});

			await sequelize.transaction(async t => {
				body.descriptions = body.descriptions || [];
				const descPromise = db.exerciseDescription.bulkCreate(body.descriptions.map(value => ({
					url: value,
					exerciseId: insertedExercise.id
				})), {transaction: t});


				let differentSetLength = false;
				file.groups = file.groups || {};
				const testSetLength = Object.keys(file.groups).reduce((prev, curKey) => {
					const value = file.groups[curKey];

					const lengthSet = Object.keys(value)
						.reduce((prev, cur: keyof GroupFile) => prev.add(value[cur].length), new Set<number>());

					if (lengthSet.size != 1) differentSetLength = true;

					return prev.set(curKey, lengthSet.size);
				}, new Map<string, number>());

				if (differentSetLength) {
					logger.error('[exercise_api::create::transaction] : test set size is not same');
					return t.rollback();
				}

				// TODO: more specific type hint
				const promises: any[] = body.groups.map((group, idx) =>
					insertGroupAndEntries(insertedExercise.id, group, testSetLength.get(idx.toString()), t));

				promises.push(descPromise);

				return Promise.all(promises);
			});

			res.redirect('/exercise');

		}
		catch (err) {
			err.status = 400;

			// TODO: error handling
			console.error(err);

			res.sendStatus(500);
		}
	});

	form.parse(req);
}

/**
 * Run and return result uploaded exercise
 *
 * @method upload
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export async function upload(req: Request, res: Response) {
	if (!req.session.signIn) return res.sendStatus(401);

	const hash = crypto.createHash('sha512');
	const file = req.files.attachment as UploadedFile;
	const entryId = req.params.entryId;
	const studentId = req.session.studentId;

	const encodingInfo: { encoding: string, confidence: number } = charsetDetector.detect(file.data);
	logger.debug('[exercise::upload::insert] : ', encodingInfo);


	let hashedOriginal: string = crypto.createHash('sha512').update(file.data).digest('hex');


	let fileContent: string;
	if (encodingInfo.encoding == 'UTF-8') {
		fileContent = iconv.decode(file.data, encodingInfo.encoding);
	}
	else {
		fileContent = iconv.decode(file.data, 'EUC-KR');
	}

	const hashedName = hash.update(fileContent).digest('hex');

	try {
		if (hashedName == hashedOriginal) {
			hashedOriginal = undefined;
		}
		else {
			// backup original file
			await fs_ext.writeFile(
				path.join(submittedExerciseOriginalPath, hashedOriginal),
				file.data,
				{mode: 0o600});
		}


		await Promise.all([
			fs_ext.writeFile(
				path.join(submittedExercisePath, hashedName),
				fileContent,
				{mode: 0o600}
			),

			db.exerciseUploadLog.create({
				studentId: studentId,
				entryId: entryId,
				email: req.session.email,
				fileName: hashedName,
				originalFile: hashedOriginal,
				id: undefined,
				submitted: undefined
			})
		]);

		return res.sendStatus(202);
	}
	catch (err) {
		logger.error('[exercise::upload::insert] : ', err.stack);
		return res.sendStatus(500);
	}
}


interface CompileEntryInfo {
	name: string,
	extension: number,
	fileName: string,
	logId: number
}

export async function judge(req: Request, res: Response) {
	if (!req.session.signIn) return res.sendStatus(401);

	const studentId = req.session.studentId;
	const groupId = req.params.groupId;

	try {
		const [srcPath, outputPath, entryList, groupInfo]: [string, string, CompileEntryInfo[], exerciseGroupInstance]
			= await Promise.all([
			fs_ext.mkdtemp(path.join(TEMP_PATH, studentId + '_')),
			fs_ext.mkdtemp(path.join(TEMP_PATH, studentId + '_')),
			// language=MySQL
			sequelize.query(`
                    SELECT name, CAST(extension AS UNSIGNED) AS \`extension\`, C.file_name AS \`fileName\`,
                        C.id AS \'logId\'
                    FROM exercise_entry
                             JOIN (SELECT A.id, A.file_name, A.entry_id
                                   FROM exercise_upload_log AS A
                                            LEFT JOIN exercise_upload_log AS B
                                   ON A.entry_id = B.entry_id AND A.submitted < B.submitted
                                   WHERE B.submitted IS NULL AND A.student_id = ?) AS C ON C.entry_id = exercise_entry.id
                    WHERE group_id = ?`,
				{
					replacements: [studentId, groupId],
					raw: true,
					type: QueryTypes.SELECT
				}),
			db.exerciseGroup.findById(groupId, {raw: true})
		]);

		// move all related files to docker linked directory
		await Promise.all(
			entryList.map(entry => fs_ext.copy(
				path.join(submittedExercisePath, entry.fileName),
				path.join(srcPath, entry.name))
			));

		const [_, judgeLog] = await Promise.all([
			// generate config file
			fs_ext.writeFile(
				path.join(srcPath, 'config.json'),
				JSON.stringify({
					compile: entryList
						.filter(entry => entry.extension == 1 || entry.extension == 3)
						.map(entry => entry.name),
					dependents: entryList
						.filter(entry => entry.extension == 2 || entry.extension == 4)
						.map(entry => entry.name),
					language: groupInfo.compileType,
					entryPoint: groupInfo.entryPoint,
					testSetSize: groupInfo.testSetSize,
					timeout: groupInfo.timeLimit
				})),

			// insert judge log
			db.exerciseJudgeLog.create({
				studentId: studentId,
				groupId: groupId,
				email: req.session.email,
				id: undefined,
				created: undefined
			})
		]);

		await Promise.all(
			entryList.map(entry => db.exerciseJudgeEntryLog.create({
				judgeId: judgeLog.id,
				uploadId: entry.logId
			}))
		);

		const inputPath = path.join(exerciseSetPath, groupId.toString(), 'input');
		const answerPath = path.join(exerciseSetPath, groupId.toString(), 'output');

		if (groupInfo.compileOnly) {
			const result = await compileTest(outputPath, srcPath);

			await storeResult(result, judgeLog.id);
			return await sendResult(res, result, inputPath, answerPath, judgeLog.id);
		}
		else {
			const result = await runJudge(outputPath, srcPath, inputPath, answerPath);

			logger.debug('[exercise::judge] : ', result);

			await storeResult(result, judgeLog.id);
			return await sendResult(res, result, inputPath, answerPath, judgeLog.id);
		}
	}
	catch (err) {
		logger.error('[exercise::judge] : ', err.stack);
		return res.sendStatus(500);
	}
}


// FIXME: nullity check
export async function sendResult(res: Response, result: JudgeResult,
								 inputPath?: string, answerPath?: string, logId?: number) {
	switch (result.type) {
		case ResultEnum.serverError:
			return res.status(500).json({id: logId});

		case ResultEnum.scriptError:
			return res.status(417).json({errorMsg: result.scriptError});

		case ResultEnum.compileError:
			return res.status(400).json({errorMsg: result.compileError});

		case ResultEnum.incorrect:
			try {
				// FIXME: consider stdin
				const answer = await fs_ext.readFile(path.join(answerPath, `${result.failedIndex}.out`), 'UTF-8');
				const input = await fs_ext.readFile(path.join(inputPath, `${result.failedIndex}.in`), 'UTF-8');

				return res.status(406).json({
					userOutput: result.userOutput,
					answerOutput: answer,
					input: input
				});
			}
			catch (err) {
				logger.error('[exercise::sendResult::incorrect::read_file] : ', err.stack);
				return res.status(500).json({id: logId});
			}

		case ResultEnum.runtimeError:
			try {
				const input = await fs_ext.readFile(path.join(inputPath, `${result.failedIndex}.in`), 'UTF-8');

				return res.status(412).json({
					input: input,
					errorLog: result.runtimeError,
					returnCode: result.returnCode
				})
			}
			catch (err) {
				logger.error('[exercise::sendResult::runtimeError::read_file] : ', err.stack);
				return res.status(500).json({id: logId});
			}

		case ResultEnum.timeout:
			try {
				const input = await fs_ext.readFile(path.join(inputPath, `${result.failedIndex}.in`), 'UTF-8');

				return res.status(410).json({input: input});
			}
			catch (err) {
				logger.error('[exercise::upload::timeout::read_file] : ', err.stack);
				return res.status(500).json({id: logId});
			}

		case ResultEnum.correct:
			return res.sendStatus(200);
	}
}


function storeResult(result: JudgeResult, logId: number) {
	return db.exerciseJudgeResult.create(
		Object.assign({logId: logId, id: undefined, created: undefined}, result));
}


interface MissingJudge {
	studentId: string,
	groupId: number,
	id: number,
	uploadLogs: { entryId: number, fileName: string }[]
}

/**
 * Rejudge unresolved exercise
 *
 * @method resolveUnhandled
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export async function resolveUnhandled(req: Request, res: Response) {
	if (!req.session.admin) return res.sendStatus(401);

	try {
		// TODO: rename to unhandledList
		// @ts-ignore
		const missingJudges: MissingJudge[] = await db.exerciseJudgeLog.findAll({
			include: [{
				model: db.exerciseJudgeResult,
				as: 'result',
				attributes: []
			}, {
				model: db.exerciseUploadLog,
				attributes: ['entryId', 'fileName'],
				as: 'uploadLogs'
			}],
			where: {'$result.id$': null},
			attributes: ['id', 'groupId', 'studentId']
		});

		logger.debug('resolveUnhandled', missingJudges);

		for (const judge of missingJudges) {
			const studentId = judge.studentId;
			const groupId = judge.groupId;
			const judgeLogId = judge.id;
			const uploadLogMap: { [key: number]: string } = judge.uploadLogs.reduce(
				(prev: { [key: number]: string }, curr) => {
					prev[curr.entryId] = curr.fileName;
					return prev;
				}, {});

			const [srcPath, outputPath, entryList, groupInfo]:
				[string, string, exerciseEntryInstance[], exerciseGroupInstance]
				= await Promise.all(
				[
					// make source directory
					fs_ext.mkdtemp(path.join(TEMP_PATH, studentId + '_')),

					// make output directory
					fs_ext.mkdtemp(path.join(TEMP_PATH, studentId + '_')),


					db.exerciseEntry.findAll({
						attributes: [['id', 'entryId'], 'name', 'extension'],
						where: {groupId: {[sequelize.Op.eq]: groupId}},
						raw: true
					}),

					db.exerciseGroup.findById(groupId, {raw: true})
				]);

			// move all related files to docker linked directory
			await Promise.all(
				entryList.map(entry => fs_ext.copy(
					path.join(submittedExercisePath, uploadLogMap[entry.id]),
					path.join(srcPath, entry.name))
				));

			// generate config file
			await fs_ext.writeFile(
				path.join(srcPath, 'config.json'),
				JSON.stringify({
					compile: entryList
						.filter(entry => entry.extension == 1 || entry.extension == 3)
						.map(entry => entry.name),
					dependents: entryList
						.filter(entry => entry.extension == 2 || entry.extension == 4)
						.map(entry => entry.name),
					language: groupInfo.compileType,
					entryPoint: groupInfo.entryPoint,
					testSetSize: groupInfo.testSetSize,
					timeout: groupInfo.timeLimit
				}));

			const inputPath = path.join(exerciseSetPath, groupId.toString(), 'input');
			const answerPath = path.join(exerciseSetPath, groupId.toString(), 'output');

			if (groupInfo.compileOnly) {
				const result = await compileTest(outputPath, srcPath);

				await storeResult(result, judgeLogId);
				await sendResult(res, result, inputPath, answerPath, judgeLogId);
			}
			else {
				const result = await runJudge(outputPath, srcPath, inputPath, answerPath);

				await storeResult(result, judgeLogId);
				await sendResult(res, result, inputPath, answerPath, judgeLogId);
			}
		}
	}
	catch (err) {
		logger.error('[exercise::resolveUnhandled::search] : ', err.stack);
		return res.sendStatus(500);
	}
}


/**
 * Send judge result of exercise data to client.
 *
 * @method fetchJudgeResult
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export async function judgeResult(req: Request, res: Response) {
	if (!req.session.signIn) return 401;

	const logId = req.params.logId;

	try {
		const [judgeLog, judgeResult] = await Promise.all([
			db.exerciseJudgeLog.findByPk(logId, {
				raw: true,
				attributes: ['studentId', 'groupId']
			}),
			db.exerciseJudgeResult.findOne({
				where: {logId: logId},
				attributes: [[sequelize.cast(sequelize.col('type'), 'UNSIGNED'), 'type'], 'failedIndex',
					'returnCode', 'userOutput', 'runtimeError', 'scriptError', 'compileError'],
				raw: true
			})
		]);

		// if non-admin user requested another one's result
		if (!req.session.admin && req.session.studentId != judgeLog.studentId) {
			return res.sendStatus(401);
		}

		const inputPath = path.join(exerciseSetPath, judgeLog.groupId.toString(), 'input');
		const answerPath = path.join(exerciseSetPath, judgeLog.groupId.toString(), 'output');

		return sendResult(res, judgeResult, inputPath, answerPath, logId);
	}
	catch (err) {
		logger.error('[exercise::fetchJudgeResult::search] : ', err.stack);
		return res.sendStatus(500);
	}
}


/**
 * Check uploaded name is already exist.
 *
 * @method checkName
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export async function checkName(req: Request, res: Response) {
	if (!req.session.admin) return res.sendStatus(401);

	try {
		const exercise = await db.exercise.findOne({
			where: {name: encodeURIComponent(req.query.name)},
			attributes: ['id']
		});

		return res.sendStatus(exercise == null ? 200 : 409);
	}
	catch (err) {
		logger.error('[exercise_api::checkName::select] : ', err.stack);
		res.sendStatus(500);
	}
}


/**
 * Send exercise file.
 *
 * @method downloadEntry
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export async function downloadEntry(req: Request, res: Response) {
	if (!req.session.signIn) return res.sendStatus(401);

	const uploadId = req.params.logId;

	try {
		// @ts-ignore
		const row: {
			studentId: number
			fileName: string
			originalFile: string
			'entry.name': string
		} = await db.exerciseUploadLog.findById(uploadId, {
			include: [{model: db.exerciseEntry, as: 'entry', attributes: ['name']}],
			attributes: ['studentId', 'fileName', 'originalFile'],
			raw: true
		});

		if (req.session.admin || row.studentId == req.session.studentId) {
			if (!('encoded' in req.query) && row.originalFile) {
				return res.download(path.join(submittedExerciseOriginalPath, row.originalFile), row['entry.name']);
			}
			else {
				return res.download(path.join(submittedExercisePath, row.fileName), row['entry.name']);
			}
		}
		else {
			logger.error('[exercise::downloadEntry::student_id-mismatch]');
			return res.sendStatus(401);
		}
	}
	catch (err) {
		logger.error('[exercise::downloadEntry::search] : ', err.stack);
		return res.sendStatus(500);
	}
}


export async function downloadGroup(req: Request, res: Response) {
	if (!req.session.signIn) return res.sendStatus(401);

	const judgeId = req.params.logId;

	try {
		const judgeLog = await db.exerciseJudgeLog.findByPk(judgeId, {
			include: [{
				model: db.exerciseUploadLog,
				as: 'uploadLogs',
				attributes: ['fileName', 'originalFile'],
				include: [{
					model: db.exerciseEntry,
					as: 'entry',
					attributes: ['name', 'extension']
				}]
			}, {
				model: db.exerciseGroup,
				as: 'group',
				attributes: ['subtitle']
			}],
			attributes: ['studentId']
		});

		const file = archiver('zip', {gzipOptions: {level: 9}});

		const name = decodeURIComponent(judgeLog.group.subtitle);

		res.setHeader('Content-disposition', `attachment; filename=${name}.zip`);
		res.type('zip');

		file.pipe(res);

		file.on('error', reason => {
			logger.error('[zip::sendZip] : ', reason.stack);
			res.sendStatus(500);
		});

		file.on('warning', reason => {
			logger.warn('[zip::sendZip] : ', reason.stack);
		});

		for (const logs of judgeLog.uploadLogs) {
			let stream;
			if (logs.originalFile != null) {
				stream = fs.createReadStream(path.join(submittedExerciseOriginalPath, logs.originalFile))
			}
			else {
				stream = fs.createReadStream(path.join(submittedExercisePath, logs.fileName))
			}

			file.append(stream, {name: `${name}/${logs.entry.name}`})
		}

		file.finalize()
	}
	catch (err) {
		logger.error('[exercise::downloadGroup] : ', err.stack);
		return res.sendStatus(500);
	}
}