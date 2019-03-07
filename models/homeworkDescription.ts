import * as sequelize from 'sequelize';
import {DataTypes} from 'sequelize';
import {homeworkDescriptionAttribute, homeworkDescriptionInstance} from './db';

module.exports = function (sequelize: sequelize.Sequelize, DataTypes: DataTypes) {
	const tmp = sequelize.define<homeworkDescriptionInstance, homeworkDescriptionAttribute>('homeworkDescription', {
		homeworkId: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			references: {
				model: 'homework',
				key: 'id'
			},
			field: 'homework_id'
		},
		url: {
			type: DataTypes.STRING(2083),
			allowNull: false,
			field: 'url'
		}
	}, {
		tableName: 'homework_description',
		timestamps: false
	});

	tmp.removeAttribute('id');

	return tmp;
};
