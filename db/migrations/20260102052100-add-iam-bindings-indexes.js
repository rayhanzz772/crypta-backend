'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First, remove old unique constraint if exists
    try {
      await queryInterface.removeConstraint(
        'iam_bindings',
        'uq_iam_bindings_unique_binding'
      )
    } catch (err) {
      // Constraint may not exist, continue
    }

    // 1. Prevent duplicate active IAM bindings
    // Unique combination: (subject_type, subject_id, resource_type, resource_id, role)
    // Partial: deleted_at IS NULL
    await queryInterface.addIndex(
      'iam_bindings',
      ['subject_type', 'subject_id', 'resource_type', 'resource_id', 'role'],
      {
        unique: true,
        name: 'idx_iam_bindings_unique_active_binding',
        where: {
          deleted_at: null
        }
      }
    )

    // 2. Optimize access evaluator queries
    // Index for: (subject_type, subject_id, resource_type, resource_id) - active only
    await queryInterface.addIndex(
      'iam_bindings',
      ['subject_type', 'subject_id', 'resource_type', 'resource_id'],
      {
        name: 'idx_iam_bindings_access_evaluator',
        where: {
          deleted_at: null
        }
      }
    )

    // 3a. Optimize listing bindings per subject
    await queryInterface.addIndex(
      'iam_bindings',
      ['subject_type', 'subject_id'],
      {
        name: 'idx_iam_bindings_by_subject',
        where: {
          deleted_at: null
        }
      }
    )

    // 3b. Optimize listing bindings per resource
    await queryInterface.addIndex(
      'iam_bindings',
      ['resource_type', 'resource_id'],
      {
        name: 'idx_iam_bindings_by_resource',
        where: {
          deleted_at: null
        }
      }
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      'iam_bindings',
      'idx_iam_bindings_unique_active_binding'
    )
    await queryInterface.removeIndex(
      'iam_bindings',
      'idx_iam_bindings_access_evaluator'
    )
    await queryInterface.removeIndex(
      'iam_bindings',
      'idx_iam_bindings_by_subject'
    )
    await queryInterface.removeIndex(
      'iam_bindings',
      'idx_iam_bindings_by_resource'
    )
  }
}
