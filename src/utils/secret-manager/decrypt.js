const crypto = require('crypto')

const KEK = Buffer.from(process.env.CRYPTA_KEK, 'base64')

function decryptSecret(version) {
  const dekDecipher = crypto.createDecipheriv(
    'aes-256-gcm',
    KEK,
    version.dek_iv
  )
  dekDecipher.setAuthTag(version.dek_tag)

  const dek = Buffer.concat([
    dekDecipher.update(version.wrapped_dek),
    dekDecipher.final()
  ])

  const dataDecipher = crypto.createDecipheriv(
    'aes-256-gcm',
    dek,
    version.data_iv
  )
  dataDecipher.setAuthTag(version.data_tag)

  const plaintext = Buffer.concat([
    dataDecipher.update(version.ciphertext),
    dataDecipher.final()
  ])

  return plaintext.toString('utf8')
}

module.exports = decryptSecret
