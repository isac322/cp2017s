import * as sequelize from 'sequelize';
import {DataTypes} from 'sequelize';
import {exerciseGroupAttribute, exerciseGroupInstance} from './db';

module.exports = function (sequelize: sequelize.Sequelize, DataTypes: DataTypes) {
	return sequelize.define<exerciseGroupInstance, exerciseGroupAttribute>('exerciseGroup', {
		id: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			primaryKey: true,
			autoIncrement: true,
			field: 'id'
		},
		exerciseId: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			references: {
				model: 'exercise',
				key: 'id'
			},
			field: 'exercise_id'
		},
		subtitle: {
			type: DataTypes.STRING(255),
			allowNull: false,
			field: 'subtitle'
		},
		testSetSize: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			defaultValue: 0,
			field: 'test_set_size'
		},
		inputThroughArg: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
			field: 'input_through_arg'
		},
		inputThroughStdin: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: true,
			field: 'input_through_stdin'
		},
		compileOnly: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
			field: 'compile_only'
		},
		compileType: {
			type: DataTypes.ENUM('cpp', 'java', 'make'),
			allowNull: false,
			field: 'compile_type'
		},
		timeLimit: {
			type: DataTypes.INTEGER(8).UNSIGNED,
			allowNull: false,
			defaultValue: 1,
			field: 'time_limit'
		},
		entryPoint: {
			type: DataTypes.STRING(255),
			allowNull: true,
			field: 'entry_point'
		}
	}, {
		tableName: 'exercise_group',
		timestamps: false
	});
};
