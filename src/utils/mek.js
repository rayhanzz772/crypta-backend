/**
 * MEK (Master Encryption Key) Utilities
 *
 * Implements the core cryptographic operations for the semi zero-knowledge
 * encryption system:
 *
 * - MEK: 256-bit random key used to encrypt all user data
 * - KEK: Key Encryption Key derived from user's password via Argon2id
 * - MEK is wrapped (encrypted) by KEK and by Recovery Key
 * - Server never stores plaintext MEK or password
 */

const crypto = require('crypto')
const argon2 = require('argon2')

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96 bits, recommended for AES-GCM
const KEY_LENGTH = 32 // 256 bits
const SALT_LENGTH = 16 // 128 bits

// Argon2id parameters for KEK derivation
const KDF_PARAMS = {
  type: argon2.argon2id,
  memoryCost: 2 ** 16, // 64 MB
  timeCost: 3,
  parallelism: 1,
  hashLength: KEY_LENGTH,
  raw: true
}

/**
 * Generate a new 256-bit Master Encryption Key
 * @returns {Buffer} 32-byte random MEK
 */
function generateMEK() {
  return crypto.randomBytes(KEY_LENGTH)
}

/**
 * Generate a random salt for Argon2id derivation
 * @returns {string} hex-encoded salt
 */
function generateSalt() {
  return crypto.randomBytes(SALT_LENGTH).toString('hex')
}

/**
 * Derive a Key Encryption Key (KEK) from password using Argon2id
 *
 * @param {string} password - User's master password
 * @param {string} salt - Hex-encoded salt
 * @returns {Promise<Buffer>} 32-byte derived key
 */
async function deriveKEK(password, salt) {
  return argon2.hash(password, {
    ...KDF_PARAMS,
    salt: Buffer.from(salt, 'hex')
  })
}

/**
 * Wrap (encrypt) the MEK using a key (KEK or Recovery Key)
 * Uses AES-256-GCM for authenticated encryption
 *
 * @param {Buffer} mek - 32-byte Master Encryption Key to wrap
 * @param {Buffer} wrappingKey - 32-byte key to wrap MEK with
 * @returns {{ encrypted: Buffer, iv: Buffer, tag: Buffer }}
 */
function wrapMEK(mek, wrappingKey) {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, wrappingKey, iv)

  const encrypted = Buffer.concat([cipher.update(mek), cipher.final()])
  const tag = cipher.getAuthTag()

  return { encrypted, iv, tag }
}

/**
 * Unwrap (decrypt) the MEK using a key (KEK or Recovery Key)
 *
 * @param {Buffer} encrypted - Encrypted MEK
 * @param {Buffer} key - 32-byte wrapping key
 * @param {Buffer} iv - Initialization vector
 * @param {Buffer} tag - Authentication tag
 * @returns {Buffer} Decrypted 32-byte MEK
 * @throws {Error} If authentication fails (wrong key)
 */
function unwrapMEK(encrypted, key, iv, tag) {
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  const mek = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return mek
}

/**
 * Encrypt plaintext data using MEK directly (AES-256-GCM)
 * No KDF needed — MEK is already a proper cryptographic key
 *
 * @param {string} plaintext - Data to encrypt
 * @param {Buffer} mek - 32-byte Master Encryption Key
 * @returns {{ ciphertext: string, iv: string, tag: string }} hex-encoded
 */
function encryptData(plaintext, mek) {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, mek, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ])

  const tag = cipher.getAuthTag()

  return {
    ciphertext: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  }
}

/**
 * Decrypt data using MEK directly
 *
 * @param {{ ciphertext: string, iv: string, tag: string }} encryptedObj - hex-encoded
 * @param {Buffer} mek - 32-byte Master Encryption Key
 * @returns {string} Decrypted plaintext
 * @throws {Error} If authentication fails
 */
function decryptData(encryptedObj, mek) {
  const { ciphertext, iv, tag } = encryptedObj

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    mek,
    Buffer.from(iv, 'hex')
  )
  decipher.setAuthTag(Buffer.from(tag, 'hex'))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'hex')),
    decipher.final()
  ])

  return decrypted.toString('utf8')
}

module.exports = {
  generateMEK,
  generateSalt,
  deriveKEK,
  wrapMEK,
  unwrapMEK,
  encryptData,
  decryptData,
  KDF_PARAMS
}
