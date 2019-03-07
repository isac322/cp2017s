import * as sequelize from 'sequelize';
import {DataTypes} from 'sequelize';
import {projectLatestEntryAttribute, projectLatestEntryInstance} from './db';

module.exports = function (sequelize: sequelize.Sequelize, DataTypes: DataTypes) {
	return sequelize.define<projectLatestEntryInstance, projectLatestEntryAttribute>('projectLatestEntry', {
		studentId: {
			type: DataTypes.STRING(32),
			allowNull: false,
			primaryKey: true,
			references: {
				model: 'user',
				key: 'student_id'
			},
			field: 'student_id'
		},
		projectId: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			primaryKey: true,
			references: {
				model: 'project',
				key: 'id'
			},
			field: 'project_id'
		},
		groupId: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			primaryKey: true,
			references: {
				model: 'project_group',
				key: 'id'
			},
			field: 'group_id'
		},
		entryId: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			primaryKey: true,
			references: {
				model: 'project_entry',
				key: 'id'
			},
			field: 'entry_id'
		},
		logId: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			references: {
				model: 'project_log',
				key: 'id'
			},
			field: 'log_id'
		}
	}, {
		tableName: 'project_latest_entry',
		timestamps: false
	});
};
