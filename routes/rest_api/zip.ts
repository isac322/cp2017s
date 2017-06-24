import * as archiver from "archiver";
import * as express from "express";
import {ReadStream} from "fs";

export interface ZipEntry {
	[student_id: string]: { [fileName: string]: ReadStream }
}

export function sendZip(res: express.Response, entries: ZipEntry, fileName: string) {
	const file = archiver('zip', {gzipOptions: {level: 9}});

	res.setHeader('Content-disposition', `attachment; filename=${fileName}.zip`);

	file.pipe(res);

	for (const studentId in entries) {
		for (const name in entries[studentId]) {
			file.append(entries[studentId][name], {name: `${studentId}/${name}`})
		}
	}

	file.finalize();
}