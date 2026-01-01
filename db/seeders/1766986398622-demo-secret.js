'use strict'

const cuid = require('cuid')
const { encryptSecret } = require('../seeders/helpers/encryption')

module.exports = {
  async up(queryInterface) {
    const project = await queryInterface.sequelize.query(
      `SELECT id FROM projects WHERE slug='crypta-prod' LIMIT 1`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    )

    const secret_id = cuid()

    await queryInterface.bulkInsert('secrets', [
      {
        id: secret_id,
        project_id: project[0].id,
        name: 'DB_PASSWORD',
        labels: JSON.stringify({ env: 'prod', type: 'database' }),
        created_by: 'system',
        created_at: new Date(),
        updated_at: new Date()
      }
    ])

    const encrypted = encryptSecret('super-secret-db-password')

    await queryInterface.bulkInsert('secret_versions', [
      {
        id: cuid(),
        secret_id,
        version: 1,

        ciphertext: encrypted.ciphertext,
        data_iv: encrypted.data_iv,
        data_tag: encrypted.data_tag,

        wrapped_dek: encrypted.wrapped_dek,
        dek_iv: encrypted.dek_iv,
        dek_tag: encrypted.dek_tag,

        status: 'enabled',
        created_at: new Date(),
        updated_at: new Date()
      }
    ])
  }
}
