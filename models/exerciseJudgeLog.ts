import * as sequelize from 'sequelize';
import {DataTypes} from 'sequelize';
import {exerciseJudgeLogAttribute, exerciseJudgeLogInstance} from './db';

module.exports = function (sequelize: sequelize.Sequelize, DataTypes: DataTypes) {
	return sequelize.define<exerciseJudgeLogInstance, exerciseJudgeLogAttribute>('exerciseJudgeLog', {
		id: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			primaryKey: true,
			autoIncrement: true,
			field: 'id'
		},
		studentId: {
			type: DataTypes.STRING(32),
			allowNull: false,
			references: {
				model: 'email',
				key: 'student_id'
			},
			field: 'student_id'
		},
		groupId: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			references: {
				model: 'exercise_group',
				key: 'id'
			},
			field: 'group_id'
		},
		email: {
			type: DataTypes.STRING(100),
			allowNull: false,
			references: {
				model: 'email',
				key: 'email'
			},
			field: 'email'
		},
		created: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: sequelize.fn('current_timestamp'),
			field: 'created'
		}
	}, {
		tableName: 'exercise_judge_log',
		timestamps: false
	});
};
