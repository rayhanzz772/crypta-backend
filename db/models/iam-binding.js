'use strict'

const { Model } = require('sequelize')
const cuid = require('cuid')

module.exports = (sequelize, DataTypes) => {
  class IamBinding extends Model {
    static associate(models) {
      // define association here
    }
  }

  IamBinding.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        defaultValue: () => cuid()
      },
      subject_type: {
        type: DataTypes.ENUM('user', 'service_account'),
        allowNull: false
      },
      subject_id: {
        type: DataTypes.STRING,
        allowNull: false
      },
      role: {
        type: DataTypes.ENUM('secret.admin', 'secret.accessor'),
        allowNull: false
      },
      resource_type: {
        type: DataTypes.ENUM('project', 'secret'),
        allowNull: false
      },
      resource_id: {
        type: DataTypes.STRING,
        allowNull: false
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'IamBinding',
      tableName: 'iam_bindings',
      paranoid: true,
      timestamps: true,
      underscored: true
    }
  )

  return IamBinding
}
