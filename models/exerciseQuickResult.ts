import * as sequelize from 'sequelize';
import {DataTypes} from 'sequelize';
import {exerciseQuickResultAttribute, exerciseQuickResultInstance} from './db';

module.exports = function (sequelize: sequelize.Sequelize, DataTypes: DataTypes) {
	return sequelize.define<exerciseQuickResultInstance, exerciseQuickResultAttribute>('exerciseQuickResult', {
		groupId: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			primaryKey: true,
			references: {
				model: 'exercise_group',
				key: 'id'
			},
			field: 'group_id'
		},
		studentId: {
			type: DataTypes.STRING(32),
			allowNull: false,
			primaryKey: true,
			references: {
				model: 'user',
				key: 'student_id'
			},
			field: 'student_id'
		}
	}, {
		tableName: 'exercise_quick_result',
		timestamps: false
	});
};
