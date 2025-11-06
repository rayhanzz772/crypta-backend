'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("vault_passwords", "kdf_type", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "argon2id",
    });

    await queryInterface.addColumn("vault_passwords", "kdf_params", {
      type: Sequelize.JSONB,
      allowNull: true,
    });

  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("vault_passwords", "kdf_type");
    await queryInterface.removeColumn("vault_passwords", "kdf_params");
  }
};
