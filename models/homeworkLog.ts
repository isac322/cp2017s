import * as sequelize from 'sequelize';
import {DataTypes} from 'sequelize';
import {homeworkLogAttribute, homeworkLogInstance} from './db';

module.exports = function (sequelize: sequelize.Sequelize, DataTypes: DataTypes) {
	return sequelize.define<homeworkLogInstance, homeworkLogAttribute>('homeworkLog', {
		id: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			primaryKey: true,
			autoIncrement: true,
			field: 'id'
		},
		studentId: {
			type: DataTypes.STRING(32),
			allowNull: false,
			references: {
				model: 'email',
				key: 'student_id'
			},
			field: 'student_id'
		},
		entryId: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			references: {
				model: 'homework_entry',
				key: 'id'
			},
			field: 'entry_id'
		},
		email: {
			type: DataTypes.STRING(100),
			allowNull: false,
			references: {
				model: 'email',
				key: 'email'
			},
			field: 'email'
		},
		fileName: {
			type: DataTypes.STRING(128),
			allowNull: false,
			field: 'file_name'
		},
		submitted: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: sequelize.fn('current_timestamp'),
			field: 'submitted'
		}
	}, {
		tableName: 'homework_log',
		timestamps: false
	});
};
