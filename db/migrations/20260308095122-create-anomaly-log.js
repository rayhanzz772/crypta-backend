'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('anomaly_log', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      login_hour: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      day_of_week: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      session_duration_min: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      failed_attempts: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      device_change: {
        type: Sequelize.BOOLEAN,
        allowNull: true
      },
      ip_change: {
        type: Sequelize.BOOLEAN,
        allowNull: true
      },
      geo_anomaly: {
        type: Sequelize.BOOLEAN,
        allowNull: true
      },
      access_count_10min: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      unique_endpoints_visited: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      vpn_used: {
        type: Sequelize.BOOLEAN,
        allowNull: true
      },
      anomaly_score: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      prediction: {
        type: Sequelize.STRING,
        allowNull: true
      },
      risk_level: {
        type: Sequelize.STRING,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('anomaly_log')
  }
}
