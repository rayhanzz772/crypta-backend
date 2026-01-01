'use strict'

const cuid = require('cuid')
const generateKeyPair = require('../../src/utils/secret-manager/generate-account-key-repair')

module.exports = {
  async up(queryInterface) {
    const [project] = await queryInterface.sequelize.query(
      `SELECT id FROM projects WHERE slug='crypta-prod' LIMIT 1`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    )

    const { publicKeyPem, privateKeyPem } = generateKeyPair()

    console.log('\n========== SAVE THIS PRIVATE KEY (CLIENT SIDE) ==========\n')
    console.log(privateKeyPem)
    console.log('========================================================\n')

    await queryInterface.bulkInsert('service_accounts', [
      {
        id: cuid(),
        project_id: project.id,
        name: 'ci-cd-service',
        client_id: 'ci-cd@crypta',
        public_key: publicKeyPem,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }
    ])
  }
}
