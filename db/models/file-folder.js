'use strict'

const { Model } = require('sequelize')
const cuid = require('cuid')

module.exports = (sequelize, DataTypes) => {
  class FileFolder extends Model {
    static associate(models) {
      FileFolder.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      })

      FileFolder.hasMany(models.File, {
        foreignKey: 'folder_id',
        as: 'files'
      })
    }
  }

  FileFolder.init(
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
      name: {
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
      modelName: 'FileFolder',
      tableName: 'file_folders',
      paranoid: true,
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['user_id', 'name']
        }
      ]
    }
  )

  return FileFolder
}
