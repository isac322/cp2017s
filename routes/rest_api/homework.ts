import * as crypto from 'crypto'
import {Request, Response} from 'express'
import {UploadedFile} from 'express-fileupload'
import * as fs from 'fs'
import {ReadStream} from 'fs'
import * as fs_ext from 'fs-extra'
import * as multiparty from 'multiparty'
import * as path from 'path'
import {parse as qsParse} from 'qs'
import {QueryTypes, Transaction} from 'sequelize'
import * as typeIs from 'type-is'

import {logger, submittedHomeworkPath, TEMP_PATH} from '../../app'
import {homeworkGroupInstance, homeworkLatestEntryInstance} from '../../models/db'
import db, {sequelize} from '../../models/index'
import {sendResult} from './exercise'
import * as judge from './judge'
import {sendZip, ZipEntry} from './zip'


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


async function insertGroupAndEntries(homeworkId: number, groupInfo: GroupInfo,
									 testSetLength: number, transaction: Transaction): Promise<void> {
	const insertedGroup = await db.homeworkGroup.create({
		homeworkId: homeworkId,
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

	await db.homeworkEntry.bulkCreate(groupInfo.entries.map(value => ({
		id: undefined,
		groupId: insertedGroup.id,
		name: value.name,
		extension: value.extension
	})), {transaction: transaction});
}

/**
 * creating a new homework request api.
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

			const insertedHomework = await db.homework.create({
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
				const descPromise = db.homeworkDescription.bulkCreate(body.descriptions.map(value => ({
					url: value,
					homeworkId: insertedHomework.id
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
					logger.error('[homework::create::transaction] : test set size is not same');
					return t.rollback();
				}

				// TODO: more specific type hint
				const promises: any[] = body.groups.map((group, idx) =>
					insertGroupAndEntries(insertedHomework.id, group, testSetLength.get(idx.toString()), t));

				promises.push(descPromise);

				return Promise.all(promises);
			});

			res.redirect('/homework');

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
 * The attachment upload request api.
 *
 * @method upload
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export async function upload(req: Request, res: Response) {
	if (!req.session.signIn) return res.sendStatus(401);

	const hash = crypto.createHash('sha512');
	const file = req.files.attachment as UploadedFile;
	const hashedName = hash.update(file.data).digest('hex');
	const entryId = req.params.entryId;

	try {
		await db.homeworkLog.create({
			studentId: req.session.studentId,
			entryId: entryId,
			email: req.session.email,
			fileName: hashedName,
			id: undefined,
			submitted: undefined
		});

		await file.mv(path.join(submittedHomeworkPath, hashedName));

		res.sendStatus(202);
	}
	catch (err) {
		logger.error('[homework::upload::insert] : ', err.stack);
		res.sendStatus(500);
	}
}


interface CompileEntryInfo {
	name: string,
	extension: number,
	fileName: string,
	logId: number
}

export async function compileTest(req: Request, res: Response) {
	if (!req.session.signIn) return res.sendStatus(401);

	const studentId = req.session.studentId;
	const groupId = req.params.groupId;

	try {
		const [
			sourcePath,
			outputPath,
			entries,
			groupInfo
		]: [string, string, CompileEntryInfo[], homeworkGroupInstance]
			= await Promise.all([
			fs_ext.mkdtemp(path.join(TEMP_PATH, studentId + '_')),
			fs_ext.mkdtemp(path.join(TEMP_PATH, studentId + '_')),
			sequelize.query(
				// language=MySQL
					`
                    SELECT homework_entry.name, CAST(extension AS UNSIGNED) AS \`extension\`,
                        homework_log.file_name AS \`fileName\`, homework_latest_entry.log_id AS \'logId\'
                    FROM homework_latest_entry
                             JOIN homework_log ON homework_latest_entry.log_id = homework_log.id
                             JOIN homework_entry ON homework_log.entry_id = homework_entry.id
                    WHERE homework_latest_entry.student_id = ? AND homework_latest_entry.group_id = ?`,
				{
					replacements: [studentId, groupId],
					raw: true,
					type: QueryTypes.SELECT
				}),
			db.homeworkGroup.findById(groupId, {raw: true})
		]);


		// move all related files to docker linked directory
		await Promise.all(
			entries.map(entry => fs_ext.copy(
				path.join(submittedHomeworkPath, entry.fileName),
				path.join(sourcePath, entry.name))
			));

		// generate config file
		await fs_ext.writeFile(
			path.join(sourcePath, 'config.json'),
			JSON.stringify({
				compile: entries
					.filter(entry => entry.extension == 1 || entry.extension == 3)
					.map(entry => entry.name),
				dependents: entries
					.filter(entry => entry.extension == 2 || entry.extension == 4)
					.map(entry => entry.name),
				language: groupInfo.compileType,
				entryPoint: groupInfo.entryPoint
			}));

		// start compile
		const result = await judge.compileTest(outputPath, sourcePath);
		return await sendResult(res, result);
	}
	catch (err) {
		logger.error('[homework::compileTest] : ', err.stack);
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
		const homework = await db.homework.findOne({
			where: {name: encodeURIComponent(req.query.name)},
			attributes: ['id']
		});

		return res.sendStatus(homework == null ? 200 : 409);
	}
	catch (err) {
		logger.error('[homework::checkName::select] : ', err.stack);
		res.sendStatus(500);
	}
}


/**
 * Send homework file.
 *
 * @method downloadSingle
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export async function downloadEntry(req: Request, res: Response) {
	if (!req.session.signIn) return res.sendStatus(401);

	const uploadId = req.params.logId;

	try {
		const row: {
			studentId: number
			fileName: string
			'entry.name': string
		} = await db.homeworkLog.findById(uploadId, {
			include: [{model: db.homeworkEntry, as: 'entry', attributes: ['name']}],
			attributes: ['studentId', 'fileName'],
			raw: true
		});

		if (req.session.admin || row.studentId == req.session.studentId) {
			res.download(path.join(submittedHomeworkPath, row.fileName), row['entry.name']);
		}
		else {
			logger.error('[homework::downloadEntry::student_id-mismatch]');
			return res.sendStatus(401);
		}
	}
	catch (err) {
		logger.error('[homework::downloadEntry::search] : ', err.stack);
		return res.sendStatus(500);
	}
}


export async function downloadAll(req: Request, res: Response) {
	if (!req.session.admin) return res.sendStatus(401);

	const homeworkId = req.params.homeworkId;
	const studentId = req.query.studentId;

	try {
		const [homeworkInfo, entries]: [ZipEntry, homeworkLatestEntryInstance[]] = await Promise.all([
			db.homework.findById(homeworkId, {
				attributes: ['name'],
				include: [{
					model: db.homeworkGroup,
					as: 'groups',
					attributes: ['subtitle'],

					include: [{
						model: db.homeworkEntry,
						as: 'entries',
						attributes: ['name', 'id']
					}]
				}]
			}),
			db.homeworkLatestEntry.findAll({
				where: {homeworkId: homeworkId},
				attributes: ['studentId', 'entryId'],
				include: [{
					model: db.homeworkLog,
					as: 'log',
					attributes: ['fileName']
				}]
			})
		]);

		const entryMap = entries.reduce((prev: Map<number, Map<string, ReadStream>>, curr: any) => {
			if (!prev.has(curr.entryId)) prev.set(curr.entryId, new Map());
			if (studentId && curr.studentId != studentId) return prev;

			prev.get(curr.entryId)
				.set(curr.studentId, fs.createReadStream(path.join(submittedHomeworkPath, curr.log.fileName)));
			return prev;
		}, new Map<number, Map<string, ReadStream>>());

		for (const group of homeworkInfo.groups) {
			for (const entry of group.entries) {
				entry.students = entryMap.get(entry.id) || new Map();
			}
		}

		sendZip(res, homeworkInfo);
	}
	catch (err) {
		logger.error('[homework::downloadAll] : ', err.stack);
		return res.sendStatus(500);
	}
}