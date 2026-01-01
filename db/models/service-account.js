'use strict'

const { Model } = require('sequelize')
const cuid = require('cuid')

module.exports = (sequelize, DataTypes) => {
  class ServiceAccount extends Model {
    static associate(models) {
      ServiceAccount.belongsTo(models.Project, {
        foreignKey: 'project_id',
        as: 'project'
      })
    }
  }

  ServiceAccount.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        defaultValue: () => cuid()
      },
      project_id: {
        type: DataTypes.STRING,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      client_id: {
        type: DataTypes.STRING,
        allowNull: false
      },
      public_key: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('active', 'disabled'),
        allowNull: false,
        defaultValue: 'active'
      }
    },
    {
      sequelize,
      modelName: 'ServiceAccount',
      tableName: 'service_accounts',
      timestamps: true,
      underscored: true
    }
  )

  return ServiceAccount
}
