import * as archiver from 'archiver'
import * as express from 'express'
import {ReadStream} from 'fs'
import {logger} from '../../app'

export interface ZipEntry {
	name: string,
	groups: Array<{
		subtitle: string,
		entries: Array<{
			id: number,
			name: string,
			students: Map<string, ReadStream>
		}>
	}>
}

export function sendZip(res: express.Response, zipInfo: ZipEntry) {
	const file = archiver('zip', {gzipOptions: {level: 9}});

	const name = decodeURIComponent(zipInfo.name);

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

	for (const group of zipInfo.groups)
		for (const entry of group.entries)
			entry.students.forEach((stream, studentId) =>
				file.append(stream, {name: `${name}/${studentId}/${group.subtitle}/${entry.name}`}));

	file.finalize()
}