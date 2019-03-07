import * as sequelize from 'sequelize';
import {DataTypes} from 'sequelize';
import {exerciseAttribute, exerciseInstance} from './db';

module.exports = function (sequelize: sequelize.Sequelize, DataTypes: DataTypes) {
	return sequelize.define<exerciseInstance, exerciseAttribute>('exercise', {
		id: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			primaryKey: true,
			autoIncrement: true,
			field: 'id'
		},
		name: {
			type: DataTypes.STRING(255),
			allowNull: false,
			unique: true,
			field: 'name'
		},
		startDate: {
			type: DataTypes.DATEONLY,
			allowNull: false,
			field: 'start_date'
		},
		endDate: {
			type: DataTypes.DATEONLY,
			allowNull: false,
			field: 'end_date'
		},
		authorId: {
			type: DataTypes.STRING(32),
			allowNull: true,
			references: {
				model: 'user',
				key: 'student_id'
			},
			field: 'author_id'
		},
		authorEmail: {
			type: DataTypes.STRING(100),
			allowNull: false,
			field: 'author_email'
		},
		created: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: sequelize.fn('current_timestamp'),
			field: 'created'
		},
		isAdminOnly: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
			field: 'is_admin_only'
		}
	}, {
		tableName: 'exercise',
		timestamps: false
	});
};
