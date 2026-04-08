'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('file_folders', {
      id: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    })

    await queryInterface.addIndex('file_folders', ['user_id', 'name'], {
      unique: true,
      name: 'file_folders_user_id_name_unique'
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('file_folders')
  }
}
