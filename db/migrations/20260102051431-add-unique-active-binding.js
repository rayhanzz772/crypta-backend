'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex(
      'iam_bindings',
      ['subject_type', 'subject_id', 'resource_type', 'resource_id', 'role'],
      {
        unique: true,
        name: 'iam_unique_active_binding',
        where: {
          deleted_at: null
        }
      }
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      'iam_bindings',
      'iam_unique_active_binding'
    )
  }
}
