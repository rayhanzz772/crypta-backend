/**
 * MEK (Master Encryption Key) Test Suite
 *
 * Tests for src/utils/mek.js and src/utils/recovery-key.js
 * - MEK generation and wrapping
 * - KEK derivation from password
 * - Data encryption/decryption with MEK
 * - Recovery key generation and parsing
 * - Full recovery flow simulation
 */

const {
  generateMEK,
  generateSalt,
  deriveKEK,
  wrapMEK,
  unwrapMEK,
  encryptData,
  decryptData
} = require('../src/utils/mek')

const {
  generateRecoveryKey,
  parseRecoveryKey
} = require('../src/utils/recovery-key')

describe('MEK Utilities', () => {
  describe('generateMEK', () => {
    test('should generate a 32-byte buffer', () => {
      const mek = generateMEK()
      expect(Buffer.isBuffer(mek)).toBe(true)
      expect(mek.length).toBe(32)
    })

    test('should generate unique keys each time', () => {
      const mek1 = generateMEK()
      const mek2 = generateMEK()
      expect(mek1.equals(mek2)).toBe(false)
    })
  })

  describe('generateSalt', () => {
    test('should generate a 32-char hex string (16 bytes)', () => {
      const salt = generateSalt()
      expect(typeof salt).toBe('string')
      expect(salt.length).toBe(32)
      expect(/^[0-9a-f]+$/.test(salt)).toBe(true)
    })

    test('should generate unique salts', () => {
      const salt1 = generateSalt()
      const salt2 = generateSalt()
      expect(salt1).not.toBe(salt2)
    })
  })

  describe('deriveKEK', () => {
    test('should derive a 32-byte key from password and salt', async () => {
      const salt = generateSalt()
      const kek = await deriveKEK('myPassword123', salt)
      expect(Buffer.isBuffer(kek)).toBe(true)
      expect(kek.length).toBe(32)
    })

    test('should produce same key for same password + salt', async () => {
      const salt = generateSalt()
      const kek1 = await deriveKEK('myPassword123', salt)
      const kek2 = await deriveKEK('myPassword123', salt)
      expect(kek1.equals(kek2)).toBe(true)
    })

    test('should produce different keys for different passwords', async () => {
      const salt = generateSalt()
      const kek1 = await deriveKEK('password1', salt)
      const kek2 = await deriveKEK('password2', salt)
      expect(kek1.equals(kek2)).toBe(false)
    })

    test('should produce different keys for different salts', async () => {
      const salt1 = generateSalt()
      const salt2 = generateSalt()
      const kek1 = await deriveKEK('myPassword123', salt1)
      const kek2 = await deriveKEK('myPassword123', salt2)
      expect(kek1.equals(kek2)).toBe(false)
    })
  })

  describe('wrapMEK / unwrapMEK', () => {
    test('should wrap and unwrap MEK correctly', () => {
      const mek = generateMEK()
      const wrappingKey = generateMEK() // 32-byte key

      const wrapped = wrapMEK(mek, wrappingKey)

      expect(wrapped).toHaveProperty('encrypted')
      expect(wrapped).toHaveProperty('iv')
      expect(wrapped).toHaveProperty('tag')
      expect(Buffer.isBuffer(wrapped.encrypted)).toBe(true)
      expect(Buffer.isBuffer(wrapped.iv)).toBe(true)
      expect(Buffer.isBuffer(wrapped.tag)).toBe(true)

      const unwrapped = unwrapMEK(
        wrapped.encrypted,
        wrappingKey,
        wrapped.iv,
        wrapped.tag
      )

      expect(unwrapped.equals(mek)).toBe(true)
    })

    test('should fail with wrong wrapping key', () => {
      const mek = generateMEK()
      const correctKey = generateMEK()
      const wrongKey = generateMEK()

      const wrapped = wrapMEK(mek, correctKey)

      expect(() => {
        unwrapMEK(wrapped.encrypted, wrongKey, wrapped.iv, wrapped.tag)
      }).toThrow()
    })

    test('should produce different outputs for same MEK (random IV)', () => {
      const mek = generateMEK()
      const key = generateMEK()

      const wrapped1 = wrapMEK(mek, key)
      const wrapped2 = wrapMEK(mek, key)

      expect(wrapped1.iv.equals(wrapped2.iv)).toBe(false)
    })
  })

  describe('wrapMEK with KEK (Argon2id)', () => {
    test('should wrap MEK with password-derived KEK', async () => {
      const mek = generateMEK()
      const salt = generateSalt()
      const kek = await deriveKEK('StrongPassword123!', salt)

      const wrapped = wrapMEK(mek, kek)
      const unwrapped = unwrapMEK(
        wrapped.encrypted,
        kek,
        wrapped.iv,
        wrapped.tag
      )

      expect(unwrapped.equals(mek)).toBe(true)
    })

    test('should fail unwrap with wrong password', async () => {
      const mek = generateMEK()
      const salt = generateSalt()
      const correctKek = await deriveKEK('CorrectPassword', salt)
      const wrongKek = await deriveKEK('WrongPassword', salt)

      const wrapped = wrapMEK(mek, correctKek)

      expect(() => {
        unwrapMEK(wrapped.encrypted, wrongKek, wrapped.iv, wrapped.tag)
      }).toThrow()
    })
  })

  describe('encryptData / decryptData', () => {
    test('should encrypt and decrypt simple string', () => {
      const mek = generateMEK()
      const plaintext = 'Hello, World!'

      const encrypted = encryptData(plaintext, mek)

      expect(encrypted).toHaveProperty('ciphertext')
      expect(encrypted).toHaveProperty('iv')
      expect(encrypted).toHaveProperty('tag')
      expect(typeof encrypted.ciphertext).toBe('string')
      expect(typeof encrypted.iv).toBe('string')
      expect(typeof encrypted.tag).toBe('string')

      const decrypted = decryptData(encrypted, mek)
      expect(decrypted).toBe(plaintext)
    })

    test('should encrypt and decrypt empty string', () => {
      const mek = generateMEK()
      const encrypted = encryptData('', mek)
      const decrypted = decryptData(encrypted, mek)
      expect(decrypted).toBe('')
    })

    test('should encrypt and decrypt unicode text', () => {
      const mek = generateMEK()
      const plaintext = '你好世界 🔐 مرحبا بالعالم'
      const encrypted = encryptData(plaintext, mek)
      const decrypted = decryptData(encrypted, mek)
      expect(decrypted).toBe(plaintext)
    })

    test('should encrypt and decrypt JSON data', () => {
      const mek = generateMEK()
      const data = {
        username: 'admin',
        password: 'SuperSecret123!',
        url: 'https://example.com'
      }
      const plaintext = JSON.stringify(data)

      const encrypted = encryptData(plaintext, mek)
      const decrypted = decryptData(encrypted, mek)

      expect(JSON.parse(decrypted)).toEqual(data)
    })

    test('should fail decryption with wrong MEK', () => {
      const mek1 = generateMEK()
      const mek2 = generateMEK()

      const encrypted = encryptData('secret', mek1)

      expect(() => {
        decryptData(encrypted, mek2)
      }).toThrow()
    })

    test('should produce unique ciphertext for same plaintext (random IV)', () => {
      const mek = generateMEK()
      const plaintext = 'same data'

      const enc1 = encryptData(plaintext, mek)
      const enc2 = encryptData(plaintext, mek)

      expect(enc1.iv).not.toBe(enc2.iv)
      expect(enc1.ciphertext).not.toBe(enc2.ciphertext)
    })

    test('should fail with corrupted ciphertext', () => {
      const mek = generateMEK()
      const encrypted = encryptData('secret', mek)

      encrypted.ciphertext =
        encrypted.ciphertext.substring(0, encrypted.ciphertext.length - 4) +
        'ffff'

      expect(() => {
        decryptData(encrypted, mek)
      }).toThrow()
    })
  })
})

describe('Recovery Key Utilities', () => {
  describe('generateRecoveryKey', () => {
    test('should produce raw buffer and formatted string', () => {
      const rk = generateRecoveryKey()

      expect(rk).toHaveProperty('raw')
      expect(rk).toHaveProperty('formatted')
      expect(Buffer.isBuffer(rk.raw)).toBe(true)
      expect(rk.raw.length).toBe(32)
      expect(typeof rk.formatted).toBe('string')
    })

    test('should format as 8 groups of 8 hex chars', () => {
      const rk = generateRecoveryKey()
      const groups = rk.formatted.split('-')

      expect(groups.length).toBe(8)
      groups.forEach((group) => {
        expect(group.length).toBe(8)
        expect(/^[0-9A-F]+$/.test(group)).toBe(true)
      })
    })

    test('should generate unique keys', () => {
      const rk1 = generateRecoveryKey()
      const rk2 = generateRecoveryKey()
      expect(rk1.formatted).not.toBe(rk2.formatted)
    })
  })

  describe('parseRecoveryKey', () => {
    test('should parse formatted key back to buffer', () => {
      const rk = generateRecoveryKey()
      const parsed = parseRecoveryKey(rk.formatted)

      expect(Buffer.isBuffer(parsed)).toBe(true)
      expect(parsed.equals(rk.raw)).toBe(true)
    })

    test('should handle lowercase input', () => {
      const rk = generateRecoveryKey()
      const parsed = parseRecoveryKey(rk.formatted.toLowerCase())
      expect(parsed.equals(rk.raw)).toBe(true)
    })

    test('should reject invalid length', () => {
      expect(() => {
        parseRecoveryKey('AAAA-BBBB')
      }).toThrow('Invalid recovery key length')
    })

    test('should reject non-hex characters', () => {
      expect(() => {
        parseRecoveryKey(
          'GGGGGGGG-GGGGGGGG-GGGGGGGG-GGGGGGGG-GGGGGGGG-GGGGGGGG-GGGGGGGG-GGGGGGGG'
        )
      }).toThrow('Invalid recovery key format')
    })
  })
})

describe('Full Recovery Flow', () => {
  test('should simulate complete register → recovery cycle', async () => {
    // === REGISTRATION ===
    const password = 'MyStrongPassword123!'

    // 1. Generate MEK
    const mek = generateMEK()

    // 2. Derive KEK from password
    const kekSalt = generateSalt()
    const kek = await deriveKEK(password, kekSalt)

    // 3. Wrap MEK with KEK
    const mekByPassword = wrapMEK(mek, kek)

    // 4. Generate recovery key
    const recoveryKey = generateRecoveryKey()

    // 5. Wrap MEK with recovery key
    const mekByRecovery = wrapMEK(mek, recoveryKey.raw)

    // 6. Encrypt some data
    const originalData = 'my super secret password!!'
    const encryptedData = encryptData(originalData, mek)

    // === VERIFY LOGIN ===
    const loginKek = await deriveKEK(password, kekSalt)
    const loginMek = unwrapMEK(
      mekByPassword.encrypted,
      loginKek,
      mekByPassword.iv,
      mekByPassword.tag
    )
    const loginDecrypted = decryptData(encryptedData, loginMek)
    expect(loginDecrypted).toBe(originalData)

    // === SIMULATE FORGOT PASSWORD ===
    const newPassword = 'MyNewPassword456!'

    // 1. Unwrap MEK with recovery key
    const recoveredKeyBuf = parseRecoveryKey(recoveryKey.formatted)
    const recoveredMek = unwrapMEK(
      mekByRecovery.encrypted,
      recoveredKeyBuf,
      mekByRecovery.iv,
      mekByRecovery.tag
    )

    expect(recoveredMek.equals(mek)).toBe(true)

    // 2. Derive new KEK
    const newKekSalt = generateSalt()
    const newKek = await deriveKEK(newPassword, newKekSalt)

    // 3. Re-wrap MEK with new KEK
    const newMekByPassword = wrapMEK(recoveredMek, newKek)

    // 4. Verify: login with new password
    const newLoginKek = await deriveKEK(newPassword, newKekSalt)
    const newLoginMek = unwrapMEK(
      newMekByPassword.encrypted,
      newLoginKek,
      newMekByPassword.iv,
      newMekByPassword.tag
    )

    // 5. Decrypt data with recovered MEK — should work!
    const recoveredDecrypted = decryptData(encryptedData, newLoginMek)
    expect(recoveredDecrypted).toBe(originalData)

    // 6. Old password should NOT work
    const oldKek = await deriveKEK(password, newKekSalt)
    expect(() => {
      unwrapMEK(
        newMekByPassword.encrypted,
        oldKek,
        newMekByPassword.iv,
        newMekByPassword.tag
      )
    }).toThrow()
  })

  test('should simulate data migration from legacy to MEK', async () => {
    const password = 'MigrationPassword123!'
    const {
      encrypt: legacyEncrypt,
      decrypt: legacyDecrypt
    } = require('../src/utils/encryption')

    // Legacy: encrypt data with master password (Argon2id per-item)
    const originalData = 'legacy secret data'
    const kdfParams = { memoryCost: 2 ** 14, timeCost: 2, parallelism: 1 }
    const legacyEncrypted = await legacyEncrypt(
      originalData,
      password,
      kdfParams
    )

    // Verify legacy works
    const legacyDecrypted = await legacyDecrypt(
      legacyEncrypted,
      password,
      kdfParams
    )
    expect(legacyDecrypted).toBe(originalData)

    // === MIGRATION ===
    // 1. Generate MEK
    const mek = generateMEK()

    // 2. Decrypt old data with legacy method
    const plaintext = await legacyDecrypt(legacyEncrypted, password, kdfParams)

    // 3. Re-encrypt with MEK
    const mekEncrypted = encryptData(plaintext, mek)

    // 4. Verify MEK decryption
    const mekDecrypted = decryptData(mekEncrypted, mek)
    expect(mekDecrypted).toBe(originalData)

    // Legacy format has salt, iv, tag, data
    expect(legacyEncrypted).toHaveProperty('salt')
    expect(legacyEncrypted).toHaveProperty('data')

    // MEK format has ciphertext, iv, tag (no salt, no KDF)
    expect(mekEncrypted).toHaveProperty('ciphertext')
    expect(mekEncrypted).not.toHaveProperty('salt')
  }, 15000)
})
