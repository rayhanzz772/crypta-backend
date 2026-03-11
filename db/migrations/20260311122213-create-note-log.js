'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('vault_logs', 'note_id', {
      type: Sequelize.STRING,
      allowNull: true,
      references: {
        model: 'secret_notes',
        key: 'id'
      }
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('vault_logs', 'note_id')
  }
}
