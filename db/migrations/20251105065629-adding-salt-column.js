'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("vault_passwords", "salt", {
      type: Sequelize.TEXT,
      allowNull: true
    });

  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("vault_passwords", "salt");
  }
};
