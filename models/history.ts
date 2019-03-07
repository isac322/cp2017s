import * as sequelize from 'sequelize';
import {DataTypes} from 'sequelize';
import {historyAttribute, historyInstance} from './db';

module.exports = function (sequelize: sequelize.Sequelize, DataTypes: DataTypes) {
	return sequelize.define<historyInstance, historyAttribute>('history', {
		id: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			primaryKey: true,
			autoIncrement: true,
			field: 'id'
		},
		homeworkId: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: true,
			references: {
				model: 'homework_log',
				key: 'id'
			},
			field: 'homework_id'
		},
		homeworkEntryId: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: true,
			references: {
				model: 'homework_entry',
				key: 'id'
			},
			field: 'homework_entry_id'
		},
		exerciseId: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: true,
			references: {
				model: 'exercise_judge_log',
				key: 'id'
			},
			field: 'exercise_id'
		},
		exerciseGroupId: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: true,
			references: {
				model: 'exercise_group',
				key: 'id'
			},
			field: 'exercise_group_id'
		},
		projectId: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: true,
			references: {
				model: 'project_log',
				key: 'id'
			},
			field: 'project_id'
		},
		projectEntryId: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: true,
			references: {
				model: 'project_entry',
				key: 'id'
			},
			field: 'project_entry_id'
		},
		category: {
			type: DataTypes.ENUM('Homework', 'Exercise', 'Project'),
			allowNull: true,
			field: 'category'
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
		created: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: sequelize.fn('current_timestamp'),
			field: 'created'
		},
		email: {
			type: DataTypes.STRING(100),
			allowNull: false,
			references: {
				model: 'email',
				key: 'email'
			},
			field: 'email'
		}
	}, {
		tableName: 'history',
		timestamps: false
	});
};
