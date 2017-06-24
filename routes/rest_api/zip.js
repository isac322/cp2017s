"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const archiver = require("archiver");
function sendZip(res, entries, fileName) {
    const file = archiver('zip', { gzipOptions: { level: 9 } });
    res.setHeader('Content-disposition', `attachment; filename=${fileName}.zip`);
    file.pipe(res);
    for (const studentId in entries) {
        for (const name in entries[studentId]) {
            file.append(entries[studentId][name], { name: `${studentId}/${name}` });
        }
    }
    file.finalize();
}
exports.sendZip = sendZip;
function sendSingleZip(res, entry, fileName) {
    const file = archiver('zip', { gzipOptions: { level: 9 } });
    res.setHeader('Content-disposition', `attachment; filename=${fileName}.zip`);
    file.pipe(res);
    for (const studentId in entry) {
        for (const name in entry[studentId]) {
            file.append(entry[studentId][name], { name: `${name}` });
        }
    }
    file.finalize();
}
exports.sendSingleZip = sendSingleZip;
