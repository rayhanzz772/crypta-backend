'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'is_verified', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })
    await queryInterface.addColumn('users', 'verification_code', {
      type: Sequelize.STRING(6),
      allowNull: true
    })
    await queryInterface.addColumn('users', 'verification_expires_at', {
      type: Sequelize.DATE,
      allowNull: true
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'is_verified')
    await queryInterface.removeColumn('users', 'verification_code')
    await queryInterface.removeColumn('users', 'verification_expires_at')
  }
}
