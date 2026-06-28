'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'recovery_otp', {
      type: Sequelize.STRING(6),
      allowNull: true,
      defaultValue: null
    })
    await queryInterface.addColumn('users', 'recovery_otp_expires_at', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'recovery_otp')
    await queryInterface.removeColumn('users', 'recovery_otp_expires_at')
  }
}
