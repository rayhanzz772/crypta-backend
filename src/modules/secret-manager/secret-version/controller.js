const cuid = require('cuid')
const { encryptSecret } = require('../../../utils/secret-manager/encrypt')

async function createSecretVersion(req, res) {
  const { Secret, SecretVersion } = req.models
  const { secret_id } = req.params
  const { plain_text } = req.body

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

  const encrypted = encryptSecret(plain_text)

  if (latest) {
    await SecretVersion.update(
      { status: 'disabled' },
      { where: { secret_id, status: 'enabled' } }
    )
  }

  const version = await SecretVersion.create({
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

  return res.status(201).json({
    success: true,
    data: {
      id: version.id,
      secret_id,
      version: version.version,
      status: version.status
    }
  })
}

async function listSecretVersions(req, res) {
  const { SecretVersion } = req.models
  const { secret_id } = req.params

  const items = await SecretVersion.findAll({
    where: { secret_id },
    attributes: ['id', 'version', 'status', 'created_at'],
    order: [['version', 'DESC']]
  })

  res.json({ success: true, data: items })
}

module.exports = { createSecretVersion, listSecretVersions }
