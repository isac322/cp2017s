import * as sequelize from 'sequelize';
import {DataTypes} from 'sequelize';
import {exerciseDescriptionAttribute, exerciseDescriptionInstance} from './db';

module.exports = function (sequelize: sequelize.Sequelize, DataTypes: DataTypes) {
	const tmp = sequelize.define<exerciseDescriptionInstance, exerciseDescriptionAttribute>('exerciseDescription', {
		exerciseId: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			references: {
				model: 'exercise',
				key: 'id'
			},
			field: 'exercise_id'
		},
		url: {
			type: DataTypes.STRING(2083),
			allowNull: false,
			field: 'url'
		}
	}, {
		tableName: 'exercise_description',
		timestamps: false
	});

	tmp.removeAttribute('id');

	return tmp;
};
