import * as archiver from "archiver";
import * as express from "express";
import {ReadStream} from "fs";

export interface ZipEntry {
	[student_id: string]: { [fileName: string]: ReadStream }
}

export function sendZip(res: express.Response, entries: ZipEntry) {
	const file = archiver('zip', {gzipOptions: {level: 9}});

	file.pipe(res);

	for (const studentId in entries) {
		for (const name in entries[studentId]) {
			file.append(entries[studentId][name], {name: `${studentId}/${name}`})
		}
	}

	file.finalize();
}