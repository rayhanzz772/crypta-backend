const { Op } = require('sequelize')

async function getSecretByName(models, project_id, secret_name) {
  return models.Secret.findOne({
    where: {
      project_id,
      name: secret_name
    }
  })
}

async function getLatestEnabledVersion(models, secret_id) {
  return models.SecretVersion.findOne({
    where: {
      secret_id,
      status: 'enabled'
    },
    order: [['version', 'DESC']]
  })
}

module.exports = {
  getSecretByName,
  getLatestEnabledVersion
}
