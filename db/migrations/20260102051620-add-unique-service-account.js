'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex(
      'service_accounts',
      ['client_id', 'project_id'],
      {
        unique: true,
        name: 'sa_unique_active',
        where: {
          deleted_at: null
        }
      }
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('service_accounts', 'sa_unique_active')
  }
}
