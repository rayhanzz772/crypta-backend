'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('service_accounts', {
      id: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true
      },
      project_id: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'projects',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      client_id: {
        type: Sequelize.STRING,
        allowNull: false
      },
      public_key: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('active', 'disabled'),
        allowNull: false,
        defaultValue: 'active'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('service_accounts ')
  }
}
