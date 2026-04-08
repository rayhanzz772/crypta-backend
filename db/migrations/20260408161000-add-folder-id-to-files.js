'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('files', 'folder_id', {
      type: Sequelize.STRING,
      allowNull: true,
      references: {
        model: 'file_folders',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    })

    await queryInterface.addIndex('files', ['user_id', 'folder_id'], {
      name: 'files_user_id_folder_id_idx'
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('files', 'files_user_id_folder_id_idx')
    await queryInterface.removeColumn('files', 'folder_id')
  }
}
