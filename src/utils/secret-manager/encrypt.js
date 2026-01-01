const crypto = require('crypto')

const KEK = Buffer.from(process.env.CRYPTA_KEK, 'base64')

if (!process.env.CRYPTA_KEK) {
  throw new Error('CRYPTA_KEK is not set')
}

if (KEK.length !== 32) {
  throw new Error('CRYPTA_KEK must be 32 bytes after base64 decoding')
}

function encryptSecret(plaintext) {
  const dek = crypto.randomBytes(32)

  const dataIv = crypto.randomBytes(12)
  const dataCipher = crypto.createCipheriv('aes-256-gcm', dek, dataIv)

  const ciphertext = Buffer.concat([
    dataCipher.update(plaintext, 'utf8'),
    dataCipher.final()
  ])

  const dataTag = dataCipher.getAuthTag()

  const dekIv = crypto.randomBytes(12)
  const dekCipher = crypto.createCipheriv('aes-256-gcm', KEK, dekIv)

  const wrappedDek = Buffer.concat([dekCipher.update(dek), dekCipher.final()])

  const dekTag = dekCipher.getAuthTag()

  return {
    ciphertext,
    data_iv: dataIv,
    data_tag: dataTag,
    wrapped_dek: wrappedDek,
    dek_iv: dekIv,
    dek_tag: dekTag
  }
}

module.exports = { encryptSecret }
