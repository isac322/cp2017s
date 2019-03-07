import * as sequelize from 'sequelize';
import {DataTypes} from 'sequelize';
import {exerciseUploadLogAttribute, exerciseUploadLogInstance} from './db';

module.exports = function (sequelize: sequelize.Sequelize, DataTypes: DataTypes) {
	return sequelize.define<exerciseUploadLogInstance, exerciseUploadLogAttribute>('exerciseUploadLog', {
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
				model: 'user',
				key: 'student_id'
			},
			field: 'student_id'
		},
		entryId: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			references: {
				model: 'exercise_entry',
				key: 'id'
			},
			field: 'entry_id'
		},
		email: {
			type: DataTypes.STRING(100),
			allowNull: false,
			field: 'email'
		},
		fileName: {
			type: DataTypes.STRING(128),
			allowNull: false,
			field: 'file_name'
		},
		originalFile: {
			type: DataTypes.STRING(128),
			allowNull: true,
			field: 'original_file'
		},
		submitted: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: sequelize.fn('current_timestamp'),
			field: 'submitted'
		}
	}, {
		tableName: 'exercise_upload_log',
		timestamps: false
	});
};
