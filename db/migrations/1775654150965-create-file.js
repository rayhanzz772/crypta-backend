'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('files', {
      id: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      bucket: {
        type: Sequelize.STRING,
        allowNull: false
      },
      object_name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      original_filename: {
        type: Sequelize.STRING,
        allowNull: false
      },
      mime_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      original_size: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      encrypted_size: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      encryption: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'AES-256-GCM'
      },
      iv: {
        type: Sequelize.STRING,
        allowNull: false
      },
      tag: {
        type: Sequelize.STRING,
        allowNull: false
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('files')
  }
}
