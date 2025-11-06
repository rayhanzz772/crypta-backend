'use strict'
const { Model } = require('sequelize')
const cuid = require('cuid')

module.exports = (sequelize, DataTypes) => {
  class VaultLog extends Model {
    static associate(models) {

    }
  }

  VaultLog.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        defaultValue: () => cuid(),
      },
      user_id: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      vault_id: { type: DataTypes.STRING, allowNull: true },
      action: { type: DataTypes.STRING, allowNull: false },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'VaultLog',
      tableName: 'vault_logs',
      timestamps: true,
      underscored: true
    }
  )
  return VaultLog
}
