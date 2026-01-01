// src/models/secretVersion.js
const { DataTypes } = require('sequelize')

module.exports = (sequelize) =>
  sequelize.define(
    'SecretVersion',
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true
      },
      secret_id: {
        type: DataTypes.STRING,
        allowNull: false
      },
      version: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      ciphertext: {
        type: DataTypes.BLOB,
        allowNull: false
      },

      data_iv: {
        type: DataTypes.BLOB,
        allowNull: false,
        field: 'data_iv'
      },
      data_tag: {
        type: DataTypes.BLOB,
        allowNull: false,
        field: 'data_tag'
      },

      wrapped_dek: {
        type: DataTypes.BLOB,
        allowNull: false,
        field: 'wrapped_dek'
      },

      dek_iv: {
        type: DataTypes.BLOB,
        allowNull: false,
        field: 'dek_iv'
      },
      dek_tag: {
        type: DataTypes.BLOB,
        allowNull: false,
        field: 'dek_tag'
      },
      status: {
        type: DataTypes.ENUM('enabled', 'disabled'),
        defaultValue: 'enabled'
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
      }
    },
    {
      tableName: 'secret_versions',
      timestamps: true,
      underscored: true
    }
  )
