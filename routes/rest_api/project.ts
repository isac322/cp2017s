import * as crypto from 'crypto'
import {Request, Response} from 'express'
import * as fs from 'fs'
import {ReadStream} from 'fs'
import * as multiparty from 'multiparty'
import * as path from 'path'
import {parse as qsParse} from 'qs'
import {Transaction} from 'sequelize'
import * as typeIs from 'type-is'

import {logger, submittedHomeworkPath, submittedProjectPath} from '../../app'
import {sequelize} from '../../models'
import {projectLatestEntryInstance} from '../../models/db'
import db from '../../models/index'
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


async function insertGroupAndEntries(projectId: number, groupInfo: GroupInfo,
									 testSetLength: number, transaction: Transaction): Promise<void> {
	const insertedGroup = await db.projectGroup.create({
		projectId: projectId,
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

	await db.projectEntry.bulkCreate(groupInfo.entries.map(value => ({
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

			const insertedProject = await db.project.create({
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
				const descPromise = db.projectDescription.bulkCreate(body.descriptions.map(value => ({
					url: value,
					projectId: insertedProject.id
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
					logger.error('[project_api::create::transaction] : test set size is not same');
					return t.rollback();
				}

				// TODO: more specific type hint
				const promises: any[] = body.groups.map((group, idx) =>
					insertGroupAndEntries(insertedProject.id, group, testSetLength.get(idx.toString()), t));

				promises.push(descPromise);

				return Promise.all(promises);
			});

			res.redirect('/project');

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
	const file = (<any>req).files.attachment;
	const hashedName = hash.update(file.data).digest('hex');
	const entryId = req.params.entryId;

	try {
		await db.projectLog.create({
			studentId: req.session.studentId,
			entryId: entryId,
			email: req.session.email,
			fileName: hashedName,
			id: undefined,
			submitted: undefined
		});

		await file.mv(path.join(submittedProjectPath, hashedName));

		res.sendStatus(202)
	}
	catch (err) {
		logger.error('[project::upload::insert] : ', err.stack);
		res.sendStatus(500);
	}
}


/**
 * Check uploaded name is already exist.
 *
 * @method checkName
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export function checkName(req: Request, res: Response) {
	if (!req.session.admin) return res.sendStatus(401);

	db.project
		.findOne({where: {name: encodeURIComponent(req.query.name)}})
		.catch(err => {
			logger.error('[project::checkName::select] : ', err.stack);
			res.sendStatus(500);
		})
		.then(value => res.sendStatus(value == null ? 200 : 409));
}


/**
 * Send project file.
 *
 * @method downloadSingle
 * @param req {Request} The express Request object.
 * @param res {Response} The express Response object.
 */
export function downloadEntry(req: Request, res: Response) {
	if (!req.session.signIn) return res.sendStatus(401);

	const uploadId = req.params.logId;

	db.projectLog.findById(uploadId, {
		include: [{model: db.projectEntry, as: 'entry', attributes: ['name']}],
		attributes: ['studentId', 'fileName'],
		raw: true

	}).catch(err => {
		logger.error('[project::downloadEntry::search] : ', err.stack);
		res.sendStatus(500);

	}).then((row: any) => {
		if (req.session.admin || row.studentId == req.session.studentId) {
			res.download(path.join(submittedProjectPath, row.fileName), row['entry.name']);
		}
		else {
			logger.error('[project::downloadEntry::student_id-mismatch]');
			res.sendStatus(401);
		}
	});
}

export async function downloadAll(req: Request, res: Response) {
	if (!req.session.admin) return res.sendStatus(401);

	const projectId = req.params.projectId;
	const studentId = req.query.studentId;

	try {
		const [projectInfo, entries]: [ZipEntry, projectLatestEntryInstance[]] = await Promise.all([
			db.project.findById(projectId, {
				attributes: ['name'],
				include: [{
					model: db.projectGroup,
					as: 'groups',
					attributes: ['subtitle'],

					include: [{
						model: db.projectEntry,
						as: 'entries',
						attributes: ['name', 'id']
					}]
				}]
			}),
			db.projectLatestEntry.findAll({
				where: {projectId: projectId},
				attributes: ['studentId', 'entryId'],
				include: [{
					model: db.projectLog,
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

		for (const group of projectInfo.groups) {
			for (const entry of group.entries) {
				entry.students = entryMap.get(entry.id) || new Map();
			}
		}

		sendZip(res, projectInfo);
	}
	catch (err) {
		logger.error('[project::downloadAll] : ', err.stack);
		return res.sendStatus(500);
	}
}