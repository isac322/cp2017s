import * as sequelize from 'sequelize';
import {DataTypes} from 'sequelize';
import {emailAttribute, emailInstance} from './db';

module.exports = function (sequelize: sequelize.Sequelize, DataTypes: DataTypes) {
	return sequelize.define<emailInstance, emailAttribute>('email', {
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
		email: {
			type: DataTypes.STRING(100),
			allowNull: false,
			primaryKey: true,
			field: 'email'
		},
		name: {
			type: DataTypes.STRING(100),
			allowNull: false,
			field: 'name'
		}
	}, {
		tableName: 'email',
		timestamps: false
	});
};
