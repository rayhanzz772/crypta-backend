'use strict'

const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class Secret extends Model {
    static associate(models) {
      Secret.belongsTo(models.Project, {
        foreignKey: 'project_id',
        as: 'project'
      })
      Secret.hasMany(models.SecretVersion, {
        foreignKey: 'secret_id',
        as: 'versions'
      })
    }
  }

  Secret.init(
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true
      },
      project_id: {
        type: DataTypes.STRING,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('active', 'disabled'),
        allowNull: false,
        defaultValue: 'active'
      },
      labels: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {}
      },
      created_by: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'Secret',
      tableName: 'secrets',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['project_id', 'name']
        }
      ]
    }
  )

  return Secret
}
