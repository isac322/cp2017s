import * as sequelize from 'sequelize';
import {DataTypes} from 'sequelize';
import {exerciseJudgeResultAttribute, exerciseJudgeResultInstance} from './db';

module.exports = function (sequelize: sequelize.Sequelize, DataTypes: DataTypes) {
	return sequelize.define<exerciseJudgeResultInstance, exerciseJudgeResultAttribute>('exerciseJudgeResult', {
		id: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			primaryKey: true,
			autoIncrement: true,
			field: 'id'
		},
		logId: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			references: {
				model: 'exercise_judge_log',
				key: 'id'
			},
			unique: true,
			field: 'log_id'
		},
		type: {
			type: DataTypes.ENUM('correct', 'incorrect', 'compile error', 'timeout', 'runtime error', 'script error'),
			allowNull: false,
			field: 'type'
		},
		returnCode: {
			type: DataTypes.INTEGER(11),
			allowNull: true,
			field: 'return_code'
		},
		failedIndex: {
			type: DataTypes.INTEGER(10).UNSIGNED,
			allowNull: true,
			field: 'failed_index'
		},
		runtimeError: {
			type: DataTypes.TEXT,
			allowNull: true,
			field: 'runtime_error'
		},
		compileError: {
			type: DataTypes.TEXT,
			allowNull: true,
			field: 'compile_error'
		},
		scriptError: {
			type: DataTypes.TEXT,
			allowNull: true,
			field: 'script_error'
		},
		userOutput: {
			type: DataTypes.TEXT,
			allowNull: true,
			field: 'user_output'
		},
		created: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: sequelize.fn('current_timestamp'),
			field: 'created'
		}
	}, {
		tableName: 'exercise_judge_result',
		timestamps: false
	});
};
