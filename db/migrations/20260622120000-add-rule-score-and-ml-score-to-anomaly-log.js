'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('anomaly_log', 'rule_score', {
      type: Sequelize.FLOAT,
      allowNull: true
    })

    await queryInterface.addColumn('anomaly_log', 'ml_score', {
      type: Sequelize.FLOAT,
      allowNull: true
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('anomaly_log', 'ml_score')
    await queryInterface.removeColumn('anomaly_log', 'rule_score')
  }
}