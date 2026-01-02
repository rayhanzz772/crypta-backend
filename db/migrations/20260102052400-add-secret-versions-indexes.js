'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove old unique constraint if exists
    try {
      await queryInterface.removeConstraint(
        'secret_versions',
        'uq_secret_versions_secret_id_version'
      )
    } catch (err) {
      // Constraint may not exist, continue
    }

    // 1. Enforce unique version number per secret - active only
    // Unique combination: (secret_id, version) when deleted_at IS NULL
    await queryInterface.addIndex('secret_versions', ['secret_id', 'version'], {
      unique: true,
      name: 'idx_secret_versions_unique_active_version',
      where: {
        deleted_at: null
      }
    })

    // 2. Enforce only ONE active/current version per secret
    // Using status enum: Unique (secret_id) WHERE status = 'enabled' AND deleted_at IS NULL
    await queryInterface.addIndex('secret_versions', ['secret_id'], {
      unique: true,
      name: 'idx_secret_versions_unique_enabled',
      where: {
        status: 'enabled',
        deleted_at: null
      }
    })

    // 3. Optimize query for fetching latest version
    // Index on (secret_id, version DESC) active only
    await queryInterface.addIndex(
      'secret_versions',
      ['secret_id', { name: 'version', order: 'DESC' }],
      {
        name: 'idx_secret_versions_latest',
        where: {
          deleted_at: null
        }
      }
    )

    // 4. Additional: Optimize status-based queries
    await queryInterface.addIndex('secret_versions', ['secret_id', 'status'], {
      name: 'idx_secret_versions_secret_status',
      where: {
        deleted_at: null
      }
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      'secret_versions',
      'idx_secret_versions_unique_active_version'
    )
    await queryInterface.removeIndex(
      'secret_versions',
      'idx_secret_versions_unique_enabled'
    )
    await queryInterface.removeIndex(
      'secret_versions',
      'idx_secret_versions_latest'
    )
    await queryInterface.removeIndex(
      'secret_versions',
      'idx_secret_versions_secret_status'
    )
  }
}
