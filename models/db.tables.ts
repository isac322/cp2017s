import * as path from "path";
import * as sequelize from 'sequelize';
import * as def from './db';

export interface ITables {
	email: def.emailModel;
	exercise: def.exerciseModel;
	exerciseGroup: def.exerciseGroupModel;
	exerciseJudgeEntryLog: def.exerciseJudgeEntryLogModel;
	exerciseDescription: def.exerciseDescriptionModel;
	exerciseEntry: def.exerciseEntryModel;
	exerciseJudgeResult: def.exerciseJudgeResultModel;
	exerciseQuickResult: def.exerciseQuickResultModel;
	exerciseUploadLog: def.exerciseUploadLogModel;
	exerciseJudgeLog: def.exerciseJudgeLogModel;
	homework: def.homeworkModel;
	homeworkDescription: def.homeworkDescriptionModel;
	homeworkEntry: def.homeworkEntryModel;
	history: def.historyModel;
	homeworkLatestEntry: def.homeworkLatestEntryModel;
	homeworkLog: def.homeworkLogModel;
	project: def.projectModel;
	homeworkGroup: def.homeworkGroupModel;
	projectEntry: def.projectEntryModel;
	projectGroup: def.projectGroupModel;
	projectDescription: def.projectDescriptionModel;
	projectLatestEntry: def.projectLatestEntryModel;
	projectLog: def.projectLogModel;
	user: def.userModel;
}

export const getModels = function (seq: sequelize.Sequelize): ITables {
	return {
		email: seq.import(path.join(__dirname, './email')),
		exercise: seq.import(path.join(__dirname, './exercise')),
		exerciseGroup: seq.import(path.join(__dirname, './exerciseGroup')),
		exerciseJudgeEntryLog: seq.import(path.join(__dirname, './exerciseJudgeEntryLog')),
		exerciseDescription: seq.import(path.join(__dirname, './exerciseDescription')),
		exerciseEntry: seq.import(path.join(__dirname, './exerciseEntry')),
		exerciseJudgeResult: seq.import(path.join(__dirname, './exerciseJudgeResult')),
		exerciseQuickResult: seq.import(path.join(__dirname, './exerciseQuickResult')),
		exerciseUploadLog: seq.import(path.join(__dirname, './exerciseUploadLog')),
		exerciseJudgeLog: seq.import(path.join(__dirname, './exerciseJudgeLog')),
		homework: seq.import(path.join(__dirname, './homework')),
		homeworkDescription: seq.import(path.join(__dirname, './homeworkDescription')),
		homeworkEntry: seq.import(path.join(__dirname, './homeworkEntry')),
		history: seq.import(path.join(__dirname, './history')),
		homeworkLatestEntry: seq.import(path.join(__dirname, './homeworkLatestEntry')),
		homeworkLog: seq.import(path.join(__dirname, './homeworkLog')),
		project: seq.import(path.join(__dirname, './project')),
		homeworkGroup: seq.import(path.join(__dirname, './homeworkGroup')),
		projectEntry: seq.import(path.join(__dirname, './projectEntry')),
		projectGroup: seq.import(path.join(__dirname, './projectGroup')),
		projectDescription: seq.import(path.join(__dirname, './projectDescription')),
		projectLatestEntry: seq.import(path.join(__dirname, './projectLatestEntry')),
		projectLog: seq.import(path.join(__dirname, './projectLog')),
		user: seq.import(path.join(__dirname, './user')),
	};
};
