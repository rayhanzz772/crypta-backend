const cuid = require('cuid')
const { encryptSecret } = require('../../../utils/secret-manager/encrypt')
const api = require('../../../utils/api')
const { HttpStatusCode } = require('axios')
const HTTP_OK = HttpStatusCode?.Ok || 200

async function createSecretVersion(req, res) {
  const { Secret, SecretVersion } = req.models
  const { secret_id } = req.params
  const { plaintext } = req.body

  const secret = await Secret.findByPk(secret_id)
  if (!secret || secret.status !== 'active') {
    return res
      .status(404)
      .json({ success: false, message: 'Secret not found or disabled' })
  }

  const latest = await SecretVersion.findOne({
    where: { secret_id },
    order: [['version', 'DESC']]
  })

  const nextVersion = latest ? latest.version + 1 : 1

  const encrypted = encryptSecret(plaintext)

  if (latest) {
    await SecretVersion.update(
      { status: 'disabled' },
      { where: { secret_id, status: 'enabled' } }
    )
  }

  const activeVersionsCount = await SecretVersion.count({
    where: { secret_id, status: 'enabled' }
  })
  if (activeVersionsCount >= 5) {
    return res.status(400).json({
      message:
        'Maximum limit of 5 active secret versions reached for this secret'
    })
  }

  await SecretVersion.create({
    id: cuid(),
    secret_id,
    version: nextVersion,

    ciphertext: encrypted.ciphertext,
    data_iv: encrypted.data_iv,
    data_tag: encrypted.data_tag,

    wrapped_dek: encrypted.wrapped_dek,
    dek_iv: encrypted.dek_iv,
    dek_tag: encrypted.dek_tag,

    status: 'enabled'
  })

  return res.status(HTTP_OK).json(api.results(null, HTTP_OK, { req }))
}

async function listSecretVersions(req, res) {
  const { SecretVersion } = req.models
  const { secret_id } = req.params

  const items = await SecretVersion.findAll({
    where: { secret_id },
    attributes: ['id', 'version', 'status', 'created_at'],
    order: [['version', 'DESC']]
  })

  return res.status(HTTP_OK).json(api.results(items, HTTP_OK, { req }))
}

module.exports = { createSecretVersion, listSecretVersions }
