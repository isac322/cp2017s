import * as sequelize from 'sequelize';
import {DataTypes} from 'sequelize';
import {exerciseJudgeEntryLogAttribute, exerciseJudgeEntryLogInstance} from './db';

module.exports = function (sequelize: sequelize.Sequelize, DataTypes: DataTypes) {
	return sequelize.define<exerciseJudgeEntryLogInstance, exerciseJudgeEntryLogAttribute>('exerciseJudgeEntryLog', {
		judgeId: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			primaryKey: true,
			references: {
				model: 'exercise_judge_log',
				key: 'id'
			},
			field: 'judge_id'
		},
		uploadId: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			primaryKey: true,
			references: {
				model: 'exercise_upload_log',
				key: 'id'
			},
			field: 'upload_id'
		}
	}, {
		tableName: 'exercise_judge_entry_log',
		timestamps: false
	});
};
