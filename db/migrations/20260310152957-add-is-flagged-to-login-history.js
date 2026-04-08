'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('login_history', 'is_flagged', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('login_history', 'is_flagged')
  }
}
