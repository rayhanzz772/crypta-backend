'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('secrets', {
      id: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true
      },
      project_id: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'projects',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      labels: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('active', 'disabled'),
        allowNull: false
      },
      created_by: {
        type: Sequelize.STRING,
        allowNull: true
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('secrets')
  }
}
