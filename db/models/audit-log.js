'use strict'

const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class AuditLog extends Model {
    static associate(models) {
      // define association here
    }
  }

  AuditLog.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true
      },
      subject_type: {
        type: DataTypes.ENUM('user', 'service_account'),
        allowNull: false
      },
      subject_id: {
        type: DataTypes.STRING,
        allowNull: false
      },
      action: {
        type: DataTypes.STRING(80),
        allowNull: false
      },
      secret_id: {
        type: DataTypes.STRING
      },
      secret_version: {
        type: DataTypes.STRING
      },
      ip_address: {
        type: DataTypes.STRING(64)
      },
      user_agent: {
        type: DataTypes.TEXT
      },
      status: {
        type: DataTypes.ENUM('success', 'denied', 'error'),
        allowNull: false
      },
      error_message: {
        type: DataTypes.TEXT
      }
    },

    {
      sequelize,
      modelName: 'AuditLog',
      tableName: 'audit_logs',
      timestamps: true,
      underscored: true
    }
  )

  return AuditLog
}
