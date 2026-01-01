const decryptSecret = require('../../../utils/secret-manager/decrypt')
const {
  getSecretByName,
  getLatestEnabledVersion
} = require('../../secret-manager/latest-secret/latest-enabled/controller')
const {
  hasSecretAccess
} = require('../latest-secret/permission-check/controller')
const logAudit = require('../../../utils/audit-logger')
const api = require('../../../utils/api')
const { HttpStatusCode } = require('axios')

async function accessLatestSecret(req, res) {
  const { Secret, SecretVersion, IamBinding, AuditLog } = req.models
  const models = req.models

  const { name } = req.params
  const service_account_id = req.auth.service_account_id
  const project_id = req.auth.project_id

  try {
    const secret = await getSecretByName(models, project_id, name)
    if (!secret) return res.status(404).json({ message: 'Secret not found' })

    const allowed = await hasSecretAccess(models, service_account_id, secret.id)

    if (!allowed) {
      await logAudit(models, {
        subject_type: 'service_account',
        subject_id: service_account_id,
        action: 'secret.access',
        secret_id: secret.id,
        status: 'denied',
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      })

      throw new Error('Access denied')
    }

    const version = await getLatestEnabledVersion(models, secret.id)
    if (!version) return res.status(404).json({ message: 'No enabled version' })

    const plaintext = decryptSecret(version)

    await logAudit(models, {
      subject_type: 'service_account',
      subject_id: service_account_id,
      action: 'secret.access',
      secret_id: secret.id,
      secret_version: 'latest',
      status: 'success',
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    })

    res.set('Cache-Control', 'no-store')

    const results = { name, version: 'latest', data: plaintext }

    return res
      .status(HttpStatusCode.Ok)
      .json(api.results(results, HttpStatusCode.Ok, { req }))
  } catch (err) {
    await logAudit(models, {
      subject_type: 'service_account',
      subject_id: service_account_id,
      action: 'secret.access',
      status: 'error',
      error_message: err.message
    })
    console.error('Create secret note error:', err)
    res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = { accessLatestSecret }
