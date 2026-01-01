'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.createTable(
        'audit_logs',
        {
          id: {
            type: Sequelize.STRING,
            primaryKey: true
          },

          subject_type: {
            type: Sequelize.ENUM('user', 'service_account'),
            allowNull: false
          },
          subject_id: { type: Sequelize.STRING(200), allowNull: false },

          action: { type: Sequelize.STRING(80), allowNull: false }, // e.g. "secret.access"
          secret_id: { type: Sequelize.STRING(200), allowNull: true },
          secret_version: { type: Sequelize.STRING(40), allowNull: true }, // e.g. "latest" or "3"

          ip_address: { type: Sequelize.STRING(64), allowNull: true },
          user_agent: { type: Sequelize.TEXT, allowNull: true },

          status: {
            type: Sequelize.ENUM('success', 'denied', 'error'),
            allowNull: false
          },
          error_message: { type: Sequelize.TEXT, allowNull: true },

          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW')
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn('NOW')
          }
        },
        { transaction: t }
      )

      await queryInterface.addIndex('audit_logs', ['action'], {
        transaction: t
      })
      await queryInterface.addIndex('audit_logs', ['created_at'], {
        transaction: t
      })
      await queryInterface.addIndex(
        'audit_logs',
        ['subject_type', 'subject_id'],
        { transaction: t }
      )
      await queryInterface.addIndex('audit_logs', ['secret_id'], {
        transaction: t
      })
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs')
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_audit_logs_subject_type";'
    )
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_audit_logs_status";'
    )
  }
}
