'use strict'
const cuid = require('cuid')

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.createTable(
        'iam_bindings',
        {
          id: {
            type: Sequelize.STRING,
            defaultValue: () => cuid(),
            primaryKey: true
          },

          subject_type: {
            type: Sequelize.ENUM('user', 'service_account'),
            allowNull: false
          },
          subject_id: { type: Sequelize.STRING(200), allowNull: false },

          resource_type: {
            type: Sequelize.ENUM('project', 'secret'),
            allowNull: false
          },
          resource_id: { type: Sequelize.STRING, allowNull: false },

          role: {
            type: Sequelize.ENUM('secret.admin', 'secret.accessor'),
            allowNull: false
          },

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

      await queryInterface.addConstraint('iam_bindings', {
        fields: [
          'subject_type',
          'subject_id',
          'resource_type',
          'resource_id',
          'role'
        ],
        type: 'unique',
        name: 'uq_iam_bindings_unique_binding',
        transaction: t
      })

      await queryInterface.addIndex(
        'iam_bindings',
        ['resource_type', 'resource_id'],
        { transaction: t }
      )
      await queryInterface.addIndex(
        'iam_bindings',
        ['subject_type', 'subject_id'],
        { transaction: t }
      )
      await queryInterface.addIndex('iam_bindings', ['role'], {
        transaction: t
      })
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('iam_bindings')
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_iam_bindings_subject_type";'
    )
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_iam_bindings_resource_type";'
    )
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_iam_bindings_role";'
    )
  }
}
