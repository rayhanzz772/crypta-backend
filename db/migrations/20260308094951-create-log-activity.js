'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('log_activity', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      endpoint: {
        type: Sequelize.STRING,
        allowNull: false
      },
      method: {
        type: Sequelize.STRING,
        allowNull: false
      },
      ip_address: {
        type: Sequelize.STRING,
        allowNull: false
      },
      device: {
        type: Sequelize.STRING,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('log_activity')
  }
}
