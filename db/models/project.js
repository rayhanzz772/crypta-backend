'use strict'

const { Model } = require('sequelize')
const cuid = require('cuid')

module.exports = (sequelize, DataTypes) => {
  class Project extends Model {
    static associate(models) {
      Project.hasMany(models.Secret, {
        foreignKey: 'project_id',
        as: 'secrets'
      })
      Project.hasMany(models.ServiceAccount, {
        foreignKey: 'project_id',
        as: 'serviceAccounts'
      })
      Project.belongsTo(models.User, {
        foreignKey: 'owner_id',
        as: 'owner'
      })
    }
  }

  Project.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
        defaultValue: () => cuid()
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      owner_id: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
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
        allowNull: true,
        defaultValue: null
      }
    },
    {
      sequelize,
      modelName: 'Project',
      tableName: 'projects',
      paranoid: true,
      timestamps: true,
      underscored: true
    }
  )

  return Project
}
