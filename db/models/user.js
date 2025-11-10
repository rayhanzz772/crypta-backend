'use strict'
const { Model } = require('sequelize')
const cuid = require('cuid')

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.VaultPassword, {
        foreignKey: 'user_id',
        as: 'vaultPasswords'
      });

      User.hasMany(models.ApiKey, {
        foreignKey: 'user_id',
        as: 'apiKeys'
      });
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        defaultValue: () => cuid(),
      },
      email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      master_hash: { type: DataTypes.STRING, allowNull: false },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true,
      underscored: true
    }
  )
  return User
}
