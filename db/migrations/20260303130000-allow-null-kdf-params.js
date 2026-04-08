'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('secret_notes', 'kdf_params', {
      type: Sequelize.JSONB,
      allowNull: true
    })

    await queryInterface.changeColumn('vault_passwords', 'kdf_params', {
      type: Sequelize.JSONB,
      allowNull: true
    })
  },

  async down(queryInterface, Sequelize) {
    // Reverting to NOT NULL might fail if there are already null values,
    // so we'll just keep it JSONB. Generally, down migrations for constraints
    // should be handled with care.
    await queryInterface.changeColumn('secret_notes', 'kdf_params', {
      type: Sequelize.JSONB,
      allowNull: false
    })

    await queryInterface.changeColumn('vault_passwords', 'kdf_params', {
      type: Sequelize.JSONB,
      allowNull: false
    })
  }
}
