'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Enforce uniqueness of secret identifiers per project
    // Unique combination: (project_id, name) - active only
    await queryInterface.addIndex('secrets', ['project_id', 'name'], {
      unique: true,
      name: 'idx_secrets_unique_active_name',
      where: {
        deleted_at: null
      }
    })

    // 2. Optimize listing active secrets per project
    await queryInterface.addIndex(
      'secrets',
      ['project_id', { name: 'created_at', order: 'DESC' }],
      {
        name: 'idx_secrets_project_created',
        where: {
          deleted_at: null,
          status: 'active'
        }
      }
    )

    // 3. Additional: Optimize queries filtering by status
    await queryInterface.addIndex('secrets', ['project_id', 'status'], {
      name: 'idx_secrets_project_status',
      where: {
        deleted_at: null
      }
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      'secrets',
      'idx_secrets_unique_active_name'
    )
    await queryInterface.removeIndex('secrets', 'idx_secrets_project_created')
    await queryInterface.removeIndex('secrets', 'idx_secrets_project_status')
  }
}
