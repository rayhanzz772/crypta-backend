'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('secret_versions', {
      id: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true
      },
      secret_id: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'secrets',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      ciphertext: {
        type: Sequelize.BLOB,
        allowNull: false
      },
      data_iv: {
        type: Sequelize.BLOB,
        allowNull: false
      },
      data_tag: {
        type: Sequelize.BLOB,
        allowNull: false
      },
      dek_iv: {
        type: Sequelize.BLOB,
        allowNull: false
      },
      dek_tag: {
        type: Sequelize.BLOB,
        allowNull: false
      },
      wrapped_dek: {
        type: Sequelize.BLOB,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('enabled', 'disabled'),
        allowNull: false,
        defaultValue: 'enabled'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    })

    await queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.addConstraint('secret_versions', {
        fields: ['secret_id', 'version'],
        type: 'unique',
        name: 'uq_secret_versions_secret_id_version',
        transaction: t
      })

      await queryInterface.addIndex(
        'secret_versions',
        ['secret_id', 'version'],
        { transaction: t }
      )
      await queryInterface.addIndex(
        'secret_versions',
        ['secret_id', 'status'],
        {
          transaction: t
        }
      )
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('secret_versions')
  }
}
