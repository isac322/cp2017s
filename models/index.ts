import * as Sequelize from 'sequelize'
import * as dbTables from './db.tables'
import * as fs from 'fs'

const dbConfig = JSON.parse(fs.readFileSync('config/database.json', 'utf-8'));
export const sequelize = new Sequelize(dbConfig.database, dbConfig.user, dbConfig.password, {
	host: dbConfig.host,
	dialect: 'mysql'
});
const db = dbTables.getModels(sequelize);

db.user.hasMany(db.email, {foreignKey: 'studentId'});
db.email.belongsTo(db.user, {foreignKey: 'studentId'});

// homework related
db.homework.hasMany(db.homeworkDescription, {foreignKey: 'homeworkId', as: 'descriptions'});

db.homework.hasMany(db.homeworkGroup, {foreignKey: 'homeworkId', as: 'groups'});
db.homeworkGroup.hasMany(db.homeworkEntry, {foreignKey: 'groupId', as: 'entries'});
db.homeworkGroup.hasMany(db.homeworkLatestEntry, {foreignKey: 'groupId', as: 'logMap'});
db.homeworkEntry.hasMany(db.homeworkLog, {foreignKey: 'entryId', as: 'logs'});
db.homeworkEntry.hasMany(db.homeworkLatestEntry, {foreignKey: 'entryId', as: 'logMap'});
db.homeworkLog.belongsTo(db.homeworkEntry, {foreignKey: 'entryId', as: 'entry'});

db.homeworkLatestEntry.belongsTo(db.homeworkEntry, {foreignKey: 'entryId', as: 'entry'});
db.homeworkLatestEntry.belongsTo(db.homeworkLog, {foreignKey: 'logId', as: 'log'});


// exercise related
db.exercise.hasMany(db.exerciseDescription, {foreignKey: 'exerciseId', as: 'descriptions'});

db.exercise.hasMany(db.exerciseGroup, {foreignKey: 'exerciseId', as: 'groups'});
db.exerciseGroup.hasMany(db.exerciseEntry, {foreignKey: 'groupId', as: 'entries'});
db.exerciseGroup.hasMany(db.exerciseJudgeLog, {foreignKey: 'groupId', as: 'judgeLogs'});
db.exerciseEntry.hasMany(db.exerciseUploadLog, {foreignKey: 'entryId', as: 'logs'});
db.exerciseJudgeLog.hasOne(db.exerciseJudgeResult, {foreignKey: 'logId', as: 'result'});
db.exerciseJudgeLog.belongsTo(db.exerciseGroup, {foreignKey: 'groupId', as: 'group'});
db.exerciseJudgeEntryLog.belongsTo(db.exerciseUploadLog, {foreignKey: 'uploadId', as: 'uploadLogs'});
db.exerciseUploadLog.belongsTo(db.exerciseEntry, {foreignKey: 'entryId', as: 'entry'});


db.exerciseUploadLog.belongsToMany(db.exerciseJudgeLog, {
	through: db.exerciseJudgeEntryLog,
	foreignKey: 'uploadId',
	as: 'judgeLogs'
});
db.exerciseJudgeLog.belongsToMany(db.exerciseUploadLog, {
	through: db.exerciseJudgeEntryLog,
	foreignKey: 'judgeId',
	as: 'uploadLogs'
});


// project related
db.project.hasMany(db.projectDescription, {foreignKey: 'projectId', as: 'descriptions'});

db.project.hasMany(db.projectGroup, {foreignKey: 'projectId', as: 'groups'});
db.projectGroup.hasMany(db.projectEntry, {foreignKey: 'groupId', as: 'entries'});
db.projectEntry.hasMany(db.projectLog, {foreignKey: 'entryId', as: 'logs'});
db.projectLog.belongsTo(db.projectEntry, {foreignKey: 'entryId', as: 'entry'});


db.history.belongsTo(db.homeworkEntry, {foreignKey: 'homeworkId'});
db.history.belongsTo(db.exerciseGroup, {foreignKey: 'exerciseGroupId'});
db.history.belongsTo(db.exerciseJudgeLog, {foreignKey: 'exerciseId'});
db.history.belongsTo(db.projectEntry, {foreignKey: 'projectId'});
db.history.belongsTo(db.user, {foreignKey: 'studentId'});

export default db;