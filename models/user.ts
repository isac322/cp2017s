import * as sequelize from 'sequelize';
import {DataTypes} from 'sequelize';
import {userAttribute, userInstance} from './db';

module.exports = function (sequelize: sequelize.Sequelize, DataTypes: DataTypes) {
	return sequelize.define<userInstance, userAttribute>('user', {
		studentId: {
			type: DataTypes.STRING(32),
			allowNull: false,
			primaryKey: true,
			field: 'student_id'
		},
		name: {
			type: DataTypes.STRING(100),
			allowNull: false,
			field: 'name'
		},
		isAdmin: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
			field: 'is_admin'
		},
		isDropped: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
			field: 'is_dropped'
		},
		created: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: sequelize.fn('current_timestamp'),
			field: 'created'
		}
	}, {
		tableName: 'user',
		timestamps: false
	});
};
