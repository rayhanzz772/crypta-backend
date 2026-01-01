'use strict'

const cuid = require('cuid')

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('audit_logs', [
      {
        id: cuid(),
        subject_type: 'user',
        subject_id: cuid(),
        action: 'secret.access',
        secret_id: cuid(),
        secret_version: 'latest',
        ip_address: '127.0.0.1',
        user_agent: 'Mozilla/5.0',
        status: 'success',
        error_message: null
      }
    ])
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('audit_logs', null, {})
  }
}
