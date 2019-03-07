import * as sequelize from 'sequelize';
import {DataTypes} from 'sequelize';
import {homeworkEntryAttribute, homeworkEntryInstance} from './db';

module.exports = function (sequelize: sequelize.Sequelize, DataTypes: DataTypes) {
	return sequelize.define<homeworkEntryInstance, homeworkEntryAttribute>('homeworkEntry', {
		id: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			primaryKey: true,
			autoIncrement: true,
			field: 'id'
		},
		groupId: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			references: {
				model: 'homework_group',
				key: 'id'
			},
			field: 'group_id'
		},
		name: {
			type: DataTypes.STRING(255),
			allowNull: false,
			field: 'name'
		},
		extension: {
			type: DataTypes.ENUM('cpp', 'hpp', 'java', 'make', 'zip', 'pdf'),
			allowNull: false,
			field: 'extension'
		}
	}, {
		tableName: 'homework_entry',
		timestamps: false
	});
};
