'use strict'
const { Model } = require('sequelize')
const cuid = require('cuid')

module.exports = (sequelize, DataTypes) => {
  class ApiKey extends Model {
    static associate(models) {
      ApiKey.belongsTo(models.User, { foreignKey: 'user_id' });
    }
  }

  ApiKey.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        defaultValue: () => cuid(),
      },
      key: { type: DataTypes.TEXT, allowNull: false, unique: true },
      user_id: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      revoked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
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
      modelName: 'ApiKey',
      tableName: 'api_keys',
      timestamps: true,
      underscored: true
    }
  )
  return ApiKey
}
