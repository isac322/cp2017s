import * as sequelize from 'sequelize';
import {DataTypes} from 'sequelize';
import {projectEntryAttribute, projectEntryInstance} from './db';

module.exports = function (sequelize: sequelize.Sequelize, DataTypes: DataTypes) {
	return sequelize.define<projectEntryInstance, projectEntryAttribute>('projectEntry', {
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
				model: 'project_group',
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
		tableName: 'project_entry',
		timestamps: false
	});
};
