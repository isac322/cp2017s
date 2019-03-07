import * as Sequelize from 'sequelize';


// table: email
export interface emailAttribute {
	studentId: string;
	email: string;
	name: string;
}

export interface emailInstance extends Sequelize.Instance<emailAttribute>, emailAttribute {
}

export interface emailModel extends Sequelize.Model<emailInstance, emailAttribute> {
}

// table: exercise
export interface exerciseAttribute {
	id: number;
	name: string;
	startDate: Date;
	endDate: Date;
	authorId?: string;
	authorEmail: string;
	created: Date;
	isAdminOnly: boolean;
}

export interface exerciseInstance extends Sequelize.Instance<exerciseAttribute>, exerciseAttribute {
}

export interface exerciseModel extends Sequelize.Model<exerciseInstance, exerciseAttribute> {
}

// table: exerciseGroup
export interface exerciseGroupAttribute {
	id: number;
	exerciseId: number;
	subtitle: string;
	testSetSize: number;
	inputThroughArg: boolean;
	inputThroughStdin: boolean;
	compileOnly: boolean;
	compileType: any;
	timeLimit: number;
	entryPoint?: string;
}

export interface exerciseGroupInstance extends Sequelize.Instance<exerciseGroupAttribute>, exerciseGroupAttribute {
}

export interface exerciseGroupModel extends Sequelize.Model<exerciseGroupInstance, exerciseGroupAttribute> {
}

// table: exerciseJudgeEntryLog
export interface exerciseJudgeEntryLogAttribute {
	judgeId: number;
	uploadId: number;
}

export interface exerciseJudgeEntryLogInstance extends Sequelize.Instance<exerciseJudgeEntryLogAttribute>, exerciseJudgeEntryLogAttribute {
}

export interface exerciseJudgeEntryLogModel extends Sequelize.Model<exerciseJudgeEntryLogInstance, exerciseJudgeEntryLogAttribute> {
}

// table: exerciseDescription
export interface exerciseDescriptionAttribute {
	exerciseId: number;
	url: string;
}

export interface exerciseDescriptionInstance extends Sequelize.Instance<exerciseDescriptionAttribute>, exerciseDescriptionAttribute {
}

export interface exerciseDescriptionModel extends Sequelize.Model<exerciseDescriptionInstance, exerciseDescriptionAttribute> {
}

// table: exerciseEntry
export interface exerciseEntryAttribute {
	id: number;
	groupId: number;
	name: string;
	extension: any;
}

export interface exerciseEntryInstance extends Sequelize.Instance<exerciseEntryAttribute>, exerciseEntryAttribute {
}

export interface exerciseEntryModel extends Sequelize.Model<exerciseEntryInstance, exerciseEntryAttribute> {
}

// table: exerciseJudgeResult
export interface exerciseJudgeResultAttribute {
	id: number;
	logId: number;
	type: any;
	returnCode?: number;
	failedIndex?: number;
	runtimeError?: string;
	compileError?: string;
	scriptError?: string;
	userOutput?: string;
	created: Date;
}

export interface exerciseJudgeResultInstance extends Sequelize.Instance<exerciseJudgeResultAttribute>, exerciseJudgeResultAttribute {
}

export interface exerciseJudgeResultModel extends Sequelize.Model<exerciseJudgeResultInstance, exerciseJudgeResultAttribute> {
}

// table: exerciseQuickResult
export interface exerciseQuickResultAttribute {
	groupId: number;
	studentId: string;
}

export interface exerciseQuickResultInstance extends Sequelize.Instance<exerciseQuickResultAttribute>, exerciseQuickResultAttribute {
}

export interface exerciseQuickResultModel extends Sequelize.Model<exerciseQuickResultInstance, exerciseQuickResultAttribute> {
}

// table: exerciseUploadLog
export interface exerciseUploadLogAttribute {
	id: number;
	studentId: string;
	entryId: number;
	email: string;
	fileName: string;
	originalFile?: string;
	submitted: Date;
}

export interface exerciseUploadLogInstance extends Sequelize.Instance<exerciseUploadLogAttribute>, exerciseUploadLogAttribute {
}

export interface exerciseUploadLogModel extends Sequelize.Model<exerciseUploadLogInstance, exerciseUploadLogAttribute> {
}

// table: exerciseJudgeLog
export interface exerciseJudgeLogAttribute {
	id: number;
	studentId: string;
	groupId: number;
	email: string;
	created: Date;
}

export interface exerciseJudgeLogInstance extends Sequelize.Instance<exerciseJudgeLogAttribute>, exerciseJudgeLogAttribute {
}

export interface exerciseJudgeLogModel extends Sequelize.Model<exerciseJudgeLogInstance, exerciseJudgeLogAttribute> {
}

// table: homework
export interface homeworkAttribute {
	id: number;
	name: string;
	startDate: Date;
	endDate: Date;
	authorId?: string;
	authorEmail: string;
	created: Date;
	isAdminOnly: boolean;
}

export interface homeworkInstance extends Sequelize.Instance<homeworkAttribute>, homeworkAttribute {
}

export interface homeworkModel extends Sequelize.Model<homeworkInstance, homeworkAttribute> {
}

// table: homeworkDescription
export interface homeworkDescriptionAttribute {
	homeworkId: number;
	url: string;
}

export interface homeworkDescriptionInstance extends Sequelize.Instance<homeworkDescriptionAttribute>, homeworkDescriptionAttribute {
}

export interface homeworkDescriptionModel extends Sequelize.Model<homeworkDescriptionInstance, homeworkDescriptionAttribute> {
}

// table: homeworkEntry
export interface homeworkEntryAttribute {
	id: number;
	groupId: number;
	name: string;
	extension: any;
}

export interface homeworkEntryInstance extends Sequelize.Instance<homeworkEntryAttribute>, homeworkEntryAttribute {
}

export interface homeworkEntryModel extends Sequelize.Model<homeworkEntryInstance, homeworkEntryAttribute> {
}

// table: history
export interface historyAttribute {
	id: number;
	homeworkId?: number;
	homeworkEntryId?: number;
	exerciseId?: number;
	exerciseGroupId?: number;
	projectId?: number;
	projectEntryId?: number;
	category?: any;
	studentId: string;
	created: Date;
	email: string;
}

export interface historyInstance extends Sequelize.Instance<historyAttribute>, historyAttribute {
}

export interface historyModel extends Sequelize.Model<historyInstance, historyAttribute> {
}

// table: homeworkLatestEntry
export interface homeworkLatestEntryAttribute {
	studentId: string;
	homeworkId: number;
	groupId: number;
	entryId: number;
	logId: number;
}

export interface homeworkLatestEntryInstance extends Sequelize.Instance<homeworkLatestEntryAttribute>, homeworkLatestEntryAttribute {
}

export interface homeworkLatestEntryModel extends Sequelize.Model<homeworkLatestEntryInstance, homeworkLatestEntryAttribute> {
}

// table: homeworkLog
export interface homeworkLogAttribute {
	id: number;
	studentId: string;
	entryId: number;
	email: string;
	fileName: string;
	submitted: Date;
}

export interface homeworkLogInstance extends Sequelize.Instance<homeworkLogAttribute>, homeworkLogAttribute {
}

export interface homeworkLogModel extends Sequelize.Model<homeworkLogInstance, homeworkLogAttribute> {
}

// table: project
export interface projectAttribute {
	id: number;
	name: string;
	startDate: Date;
	endDate: Date;
	authorId?: string;
	authorEmail: string;
	created: Date;
	isAdminOnly: boolean;
}

export interface projectInstance extends Sequelize.Instance<projectAttribute>, projectAttribute {
}

export interface projectModel extends Sequelize.Model<projectInstance, projectAttribute> {
}

// table: homeworkGroup
export interface homeworkGroupAttribute {
	id: number;
	homeworkId: number;
	subtitle: string;
	testSetSize: number;
	inputThroughArg: boolean;
	inputThroughStdin: boolean;
	compileOnly: boolean;
	// FIXME: enum
	compileType: any;
	timeLimit: number;
	entryPoint?: string;
}

export interface homeworkGroupInstance extends Sequelize.Instance<homeworkGroupAttribute>, homeworkGroupAttribute {
}

export interface homeworkGroupModel extends Sequelize.Model<homeworkGroupInstance, homeworkGroupAttribute> {
}

// table: projectEntry
export interface projectEntryAttribute {
	id: number;
	groupId: number;
	name: string;
	extension: any;
}

export interface projectEntryInstance extends Sequelize.Instance<projectEntryAttribute>, projectEntryAttribute {
}

export interface projectEntryModel extends Sequelize.Model<projectEntryInstance, projectEntryAttribute> {
}

// table: projectGroup
export interface projectGroupAttribute {
	id: number;
	projectId: number;
	subtitle: string;
	testSetSize: number;
	inputThroughArg: boolean;
	inputThroughStdin: boolean;
	compileOnly: boolean;
	// FIXME: enum
	compileType: any;
	timeLimit: number;
	entryPoint?: string;
}

export interface projectGroupInstance extends Sequelize.Instance<projectGroupAttribute>, projectGroupAttribute {
}

export interface projectGroupModel extends Sequelize.Model<projectGroupInstance, projectGroupAttribute> {
}

// table: projectDescription
export interface projectDescriptionAttribute {
	projectId: number;
	url: string;
}

export interface projectDescriptionInstance extends Sequelize.Instance<projectDescriptionAttribute>, projectDescriptionAttribute {
}

export interface projectDescriptionModel extends Sequelize.Model<projectDescriptionInstance, projectDescriptionAttribute> {
}

// table: projectLatestEntry
export interface projectLatestEntryAttribute {
	studentId: string;
	projectId: number;
	groupId: number;
	entryId: number;
	logId: number;
}

export interface projectLatestEntryInstance extends Sequelize.Instance<projectLatestEntryAttribute>, projectLatestEntryAttribute {
}

export interface projectLatestEntryModel extends Sequelize.Model<projectLatestEntryInstance, projectLatestEntryAttribute> {
}

// table: projectLog
export interface projectLogAttribute {
	id: number;
	studentId: string;
	entryId: number;
	email: string;
	fileName: string;
	submitted: Date;
}

export interface projectLogInstance extends Sequelize.Instance<projectLogAttribute>, projectLogAttribute {
}

export interface projectLogModel extends Sequelize.Model<projectLogInstance, projectLogAttribute> {
}

// table: user
export interface userAttribute {
	studentId: string;
	name: string;
	isAdmin: number;
	isDropped: number;
	created: Date;
}

export interface userInstance extends Sequelize.Instance<userAttribute>, userAttribute {
}

export interface userModel extends Sequelize.Model<userInstance, userAttribute> {
}
