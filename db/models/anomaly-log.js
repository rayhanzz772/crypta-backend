'use strict'
const { Model } = require('sequelize')
const cuid = require('cuid')

module.exports = (sequelize, DataTypes) => {
  class AnomalyLog extends Model {
    static associate(models) {
      AnomalyLog.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      })
    }
  }

  AnomalyLog.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        defaultValue: () => cuid()
      },
      user_id: { type: DataTypes.STRING, allowNull: false },
      login_hour: { type: DataTypes.INTEGER, allowNull: true },
      day_of_week: { type: DataTypes.INTEGER, allowNull: true },
      session_duration_min: { type: DataTypes.FLOAT, allowNull: true },
      failed_attempts: { type: DataTypes.INTEGER, allowNull: true },
      device_change: { type: DataTypes.BOOLEAN, allowNull: true },
      ip_change: { type: DataTypes.BOOLEAN, allowNull: true },
      geo_anomaly: { type: DataTypes.BOOLEAN, allowNull: true },
      access_count_10min: { type: DataTypes.INTEGER, allowNull: true },
      unique_endpoints_visited: { type: DataTypes.INTEGER, allowNull: true },
      vpn_used: { type: DataTypes.BOOLEAN, allowNull: true },
      anomaly_score: { type: DataTypes.FLOAT, allowNull: true },
      prediction: { type: DataTypes.STRING, allowNull: true },
      risk_level: { type: DataTypes.STRING, allowNull: true },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: 'AnomalyLog',
      tableName: 'anomaly_log',
      timestamps: false,
      underscored: true
    }
  )
  return AnomalyLog
}
