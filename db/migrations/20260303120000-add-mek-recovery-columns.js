'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'kek_salt', {
      type: Sequelize.STRING(64),
      allowNull: true
    })

    await queryInterface.addColumn('users', 'encrypted_mek_by_password', {
      type: Sequelize.BLOB,
      allowNull: true
    })

    await queryInterface.addColumn('users', 'mek_pw_iv', {
      type: Sequelize.BLOB,
      allowNull: true
    })

    await queryInterface.addColumn('users', 'mek_pw_tag', {
      type: Sequelize.BLOB,
      allowNull: true
    })

    await queryInterface.addColumn('users', 'encrypted_mek_by_recovery', {
      type: Sequelize.BLOB,
      allowNull: true
    })

    await queryInterface.addColumn('users', 'mek_rc_iv', {
      type: Sequelize.BLOB,
      allowNull: true
    })

    await queryInterface.addColumn('users', 'mek_rc_tag', {
      type: Sequelize.BLOB,
      allowNull: true
    })

    await queryInterface.addColumn('users', 'mek_version', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'kek_salt')
    await queryInterface.removeColumn('users', 'encrypted_mek_by_password')
    await queryInterface.removeColumn('users', 'mek_pw_iv')
    await queryInterface.removeColumn('users', 'mek_pw_tag')
    await queryInterface.removeColumn('users', 'encrypted_mek_by_recovery')
    await queryInterface.removeColumn('users', 'mek_rc_iv')
    await queryInterface.removeColumn('users', 'mek_rc_tag')
    await queryInterface.removeColumn('users', 'mek_version')
  }
}
