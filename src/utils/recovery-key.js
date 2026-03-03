/**
 * Recovery Key Utilities
 *
 * Generates a 256-bit random recovery key and formats it
 * in a human-readable hexadecimal format:
 *   XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX
 *
 * The recovery key is shown to the user ONCE at registration.
 * It is NEVER stored on the server — only used to wrap the MEK.
 */

const crypto = require('crypto')

const KEY_LENGTH = 32 // 256 bits
const GROUP_SIZE = 8 // characters per group
const SEPARATOR = '-'

/**
 * Generate a new 256-bit recovery key
 *
 * @returns {{ raw: Buffer, formatted: string }}
 *   raw      — 32-byte buffer (used as AES-256 key for wrapping MEK)
 *   formatted — human-readable hex string with dashes
 */
function generateRecoveryKey() {
  const raw = crypto.randomBytes(KEY_LENGTH)
  const hex = raw.toString('hex').toUpperCase()

  // Split into groups of 8 for readability
  const groups = []
  for (let i = 0; i < hex.length; i += GROUP_SIZE) {
    groups.push(hex.substring(i, i + GROUP_SIZE))
  }

  return {
    raw,
    formatted: groups.join(SEPARATOR)
  }
}

/**
 * Parse a formatted recovery key back to a Buffer
 * Strips dashes and converts hex to buffer
 *
 * @param {string} formatted - e.g. "A1B2C3D4-E5F6A7B8-..."
 * @returns {Buffer} 32-byte key
 * @throws {Error} If format is invalid
 */
function parseRecoveryKey(formatted) {
  const hex = formatted.replace(/-/g, '').trim()

  if (hex.length !== KEY_LENGTH * 2) {
    throw new Error(
      `Invalid recovery key length: expected ${KEY_LENGTH * 2} hex chars, got ${hex.length}`
    )
  }

  if (!/^[0-9A-Fa-f]+$/.test(hex)) {
    throw new Error('Invalid recovery key format: must be hexadecimal')
  }

  return Buffer.from(hex, 'hex')
}

module.exports = {
  generateRecoveryKey,
  parseRecoveryKey
}
