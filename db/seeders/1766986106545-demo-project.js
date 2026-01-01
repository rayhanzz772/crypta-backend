'use strict'

const cuid = require('cuid')

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('projects', [
      {
        id: cuid(),
        name: 'Crypta Production',
        slug: 'crypta-prod',
        created_at: new Date(),
        updated_at: new Date()
      }
    ])
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('projects', null, {})
  }
}
