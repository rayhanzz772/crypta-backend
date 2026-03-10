'use strict'
const { Model } = require('sequelize')
const cuid = require('cuid')

module.exports = (sequelize, DataTypes) => {
  class LogActivity extends Model {
    static associate(models) {
      LogActivity.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      })
    }
  }

  LogActivity.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        defaultValue: () => cuid()
      },
      user_id: { type: DataTypes.STRING, allowNull: false },
      endpoint: { type: DataTypes.STRING, allowNull: false },
      method: { type: DataTypes.STRING, allowNull: false },
      ip_address: { type: DataTypes.STRING, allowNull: false },
      device: { type: DataTypes.STRING, allowNull: true },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: 'LogActivity',
      tableName: 'log_activity',
      timestamps: false,
      underscored: true
    }
  )
  return LogActivity
}
