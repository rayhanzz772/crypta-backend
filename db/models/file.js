'use strict'

const { Model } = require('sequelize')
const cuid = require('cuid')

module.exports = (sequelize, DataTypes) => {
  class File extends Model {
    static associate(models) {
      File.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      })

      File.belongsTo(models.FileFolder, {
        foreignKey: 'folder_id',
        as: 'folder'
      })
    }
  }

  File.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        defaultValue: () => cuid()
      },
      user_id: {
        type: DataTypes.STRING,
        allowNull: false
      },
      folder_id: {
        type: DataTypes.STRING,
        allowNull: true
      },
      bucket: {
        type: DataTypes.STRING,
        allowNull: false
      },
      object_name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      original_filename: {
        type: DataTypes.STRING,
        allowNull: false
      },
      mime_type: {
        type: DataTypes.STRING,
        allowNull: false
      },
      original_size: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      encrypted_size: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      encryption: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'AES-256-GCM'
      },
      iv: {
        type: DataTypes.STRING,
        allowNull: false
      },
      tag: {
        type: DataTypes.STRING,
        allowNull: false
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
      modelName: 'File',
      tableName: 'files',
      paranoid: true,
      timestamps: true,
      underscored: true
    }
  )

  return File
}
