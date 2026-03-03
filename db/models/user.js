'use strict'
const { Model } = require('sequelize')
const cuid = require('cuid')

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.VaultPassword, {
        foreignKey: 'user_id',
        as: 'vaultPasswords'
      })

      User.hasMany(models.Favorite, {
        foreignKey: 'user_id',
        as: 'favorites'
      })

      User.hasMany(models.Project, {
        foreignKey: 'owner_id',
        as: 'ownedProjects'
      })
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        defaultValue: () => cuid()
      },
      email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      master_hash: { type: DataTypes.STRING, allowNull: false },

      // --- MEK / Recovery Key columns ---
      kek_salt: { type: DataTypes.STRING(64), allowNull: true },
      encrypted_mek_by_password: { type: DataTypes.BLOB, allowNull: true },
      mek_pw_iv: { type: DataTypes.BLOB, allowNull: true },
      mek_pw_tag: { type: DataTypes.BLOB, allowNull: true },
      encrypted_mek_by_recovery: { type: DataTypes.BLOB, allowNull: true },
      mek_rc_iv: { type: DataTypes.BLOB, allowNull: true },
      mek_rc_tag: { type: DataTypes.BLOB, allowNull: true },
      mek_version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
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
      modelName: 'User',
      tableName: 'users',
      timestamps: true,
      underscored: true
    }
  )
  return User
}
