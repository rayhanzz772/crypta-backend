'use strict'
const { Model } = require('sequelize')
const cuid = require('cuid')

module.exports = (sequelize, DataTypes) => {
  class VaultPassword extends Model {
    static associate(models) {
      VaultPassword.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
      VaultPassword.belongsTo(models.Category, {
        foreignKey: 'category_id',
        as: 'category'
      });
    }
  }

  VaultPassword.init(
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
      name: { type: DataTypes.STRING, allowNull: false },
      category_id: { type: DataTypes.STRING, allowNull: true },
      username: { type: DataTypes.TEXT },
      password_encrypted: { type: DataTypes.TEXT, allowNull: false },
      note: { type: DataTypes.TEXT, allowNull: true },
      salt: { type: DataTypes.TEXT, allowNull: true },
      kdf_type: {
        type: DataTypes.STRING,
        defaultValue: "argon2id",
      },
      kdf_params: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
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
      paranoid: true,
      modelName: 'VaultPassword',
      tableName: 'vault_passwords',
      timestamps: true,
      underscored: true
    }
  )
  return VaultPassword
}
