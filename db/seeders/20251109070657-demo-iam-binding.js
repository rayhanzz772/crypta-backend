'use strict'

const cuid = require('cuid')

module.exports = {
  async up(queryInterface) {
    const secret = await queryInterface.sequelize.query(
      `SELECT id FROM secrets WHERE name='DB_PASSWORD' LIMIT 1`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    )

    await queryInterface.bulkInsert('iam_bindings', [
      {
        id: cuid(),
        subject_type: 'service_account',
        subject_id: 'ci-cd@crypta',
        resource_type: 'secret',
        resource_id: secret[0].id,
        role: 'secret.accessor'
      }
    ])
  }
}
