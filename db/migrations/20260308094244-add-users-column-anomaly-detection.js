'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'last_login_at', {
      type: Sequelize.DATE,
      allowNull: true
    })

    await queryInterface.addColumn('users', 'last_ip', {
      type: Sequelize.STRING,
      allowNull: true
    })

    await queryInterface.addColumn('users', 'last_location', {
      type: Sequelize.STRING,
      allowNull: true
    })

    await queryInterface.addColumn('users', 'last_device', {
      type: Sequelize.STRING,
      allowNull: true
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'last_login_at')
    await queryInterface.removeColumn('users', 'last_ip')
    await queryInterface.removeColumn('users', 'last_location')
    await queryInterface.removeColumn('users', 'last_device')
  }
}
