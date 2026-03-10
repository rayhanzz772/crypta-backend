'use strict'
const { Model } = require('sequelize')
const cuid = require('cuid')

module.exports = (sequelize, DataTypes) => {
  class LoginHistory extends Model {
    static associate(models) {
      LoginHistory.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      })
    }
  }

  LoginHistory.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        defaultValue: () => cuid()
      },
      user_id: { type: DataTypes.STRING, allowNull: false },
      login_time: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      last_active_at: { type: DataTypes.DATE, allowNull: true },
      ip_address: { type: DataTypes.STRING, allowNull: true },
      device: { type: DataTypes.STRING, allowNull: true },
      location: { type: DataTypes.STRING, allowNull: true },
      vpn_used: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      status: {
        type: DataTypes.ENUM('success', 'failed', 'blocked'),
        allowNull: false,
        defaultValue: 'success'
      },
      is_flagged: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: 'LoginHistory',
      tableName: 'login_history',
      timestamps: false,
      underscored: true
    }
  )
  return LoginHistory
}
