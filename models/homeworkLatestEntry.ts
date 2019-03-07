import * as sequelize from 'sequelize';
import {DataTypes} from 'sequelize';
import {homeworkLatestEntryAttribute, homeworkLatestEntryInstance} from './db';

module.exports = function (sequelize: sequelize.Sequelize, DataTypes: DataTypes) {
	return sequelize.define<homeworkLatestEntryInstance, homeworkLatestEntryAttribute>('homeworkLatestEntry', {
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
		homeworkId: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			primaryKey: true,
			references: {
				model: 'homework',
				key: 'id'
			},
			field: 'homework_id'
		},
		groupId: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			primaryKey: true,
			references: {
				model: 'homework_group',
				key: 'id'
			},
			field: 'group_id'
		},
		entryId: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			primaryKey: true,
			references: {
				model: 'homework_entry',
				key: 'id'
			},
			field: 'entry_id'
		},
		logId: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			references: {
				model: 'homework_log',
				key: 'id'
			},
			field: 'log_id'
		}
	}, {
		tableName: 'homework_latest_entry',
		timestamps: false
	});
};
