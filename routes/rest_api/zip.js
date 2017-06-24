"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const archiver = require("archiver");
function sendZip(res, entries) {
    const file = archiver('zip', { gzipOptions: { level: 9 } });
    file.pipe(res);
    for (const studentId in entries) {
        for (const name in entries[studentId]) {
            file.append(entries[studentId][name], { name: `${studentId}/${name}` });
        }
    }
    file.finalize();
}
exports.sendZip = sendZip;
