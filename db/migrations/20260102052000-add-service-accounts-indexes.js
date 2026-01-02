'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Enforce uniqueness of active service accounts per project
    // Unique combination: (project_id, client_id) only when deleted_at IS NULL
    await queryInterface.addIndex(
      'service_accounts',
      ['project_id', 'client_id'],
      {
        unique: true,
        name: 'idx_service_accounts_unique_active_client',
        where: {
          deleted_at: null
        }
      }
    )

    // 2. Optimize listing of active service accounts by project
    // Index for (project_id, created_at DESC) - filter active only
    await queryInterface.addIndex(
      'service_accounts',
      ['project_id', { name: 'created_at', order: 'DESC' }],
      {
        name: 'idx_service_accounts_project_created',
        where: {
          deleted_at: null
        }
      }
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      'service_accounts',
      'idx_service_accounts_unique_active_client'
    )
    await queryInterface.removeIndex(
      'service_accounts',
      'idx_service_accounts_project_created'
    )
  }
}
