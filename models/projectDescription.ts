import * as sequelize from 'sequelize';
import {DataTypes} from 'sequelize';
import {projectDescriptionAttribute, projectDescriptionInstance} from './db';

module.exports = function (sequelize: sequelize.Sequelize, DataTypes: DataTypes) {
	const tmp = sequelize.define<projectDescriptionInstance, projectDescriptionAttribute>('projectDescription', {
		projectId: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			references: {
				model: 'project',
				key: 'id'
			},
			field: 'project_id'
		},
		url: {
			type: DataTypes.STRING(2083),
			allowNull: false,
			field: 'url'
		}
	}, {
		tableName: 'project_description',
		timestamps: false
	});

	tmp.removeAttribute('id');

	return tmp;
};
