'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add deleted_at column to secret_versions table for soft delete support
    await queryInterface.addColumn('secret_versions', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('secret_versions', 'deleted_at')
  }
}
