const jwt = require('jsonwebtoken')
const db = require('../../../db/models')
const User = db.User
const bcrypt = require('bcrypt')
const { checkPasswordBreach } = require('../../utils/pwnedCheck')
const {
  generateMEK,
  generateSalt,
  deriveKEK,
  wrapMEK,
  unwrapMEK
} = require('../../utils/mek')
const {
  generateRecoveryKey,
  parseRecoveryKey
} = require('../../utils/recovery-key')
const { encrypt, decrypt } = require('../../utils/encryption')
const { encryptData, decryptData } = require('../../utils/mek')

/**
 * POST /auth/register
 *
 * 1. Validate & check breach
 * 2. Hash password (bcrypt) for authentication
 * 3. Generate MEK (256-bit)
 * 4. Derive KEK from password (Argon2id)
 * 5. Wrap MEK with KEK → encrypted_mek_by_password
 * 6. Generate Recovery Key (256-bit)
 * 7. Wrap MEK with Recovery Key → encrypted_mek_by_recovery
 * 8. Return recovery key to user ONCE
 */
exports.register = async (req, res) => {
  try {
    const { email, master_password } = req.body

    if (!email || !master_password) {
      return res.status(400).json({
        success: false,
        message: 'Email and master_password are required'
      })
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      })
    }

    // Check password against known breaches
    const breachCount = await checkPasswordBreach(master_password)
    if (breachCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Password ini ditemukan ${breachCount} kali dalam kebocoran data publik. Gunakan password yang lebih aman.`
      })
    }

    // Step 1: Hash password for authentication (bcrypt)
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(master_password, saltRounds)

    // Step 2: Generate MEK (256-bit random key)
    const mek = generateMEK()

    // Step 3: Derive KEK from password using Argon2id
    const kekSalt = generateSalt()
    const kek = await deriveKEK(master_password, kekSalt)

    // Step 4: Wrap MEK with KEK (AES-256-GCM)
    const mekByPassword = wrapMEK(mek, kek)

    // Step 5: Generate Recovery Key (256-bit, human-readable)
    const recoveryKey = generateRecoveryKey()

    // Step 6: Wrap MEK with Recovery Key (AES-256-GCM)
    const mekByRecovery = wrapMEK(mek, recoveryKey.raw)

    // Step 7: Store everything in database
    const user = await User.create({
      email,
      master_hash: passwordHash,
      kek_salt: kekSalt,
      encrypted_mek_by_password: mekByPassword.encrypted,
      mek_pw_iv: mekByPassword.iv,
      mek_pw_tag: mekByPassword.tag,
      encrypted_mek_by_recovery: mekByRecovery.encrypted,
      mek_rc_iv: mekByRecovery.iv,
      mek_rc_tag: mekByRecovery.tag,
      mek_version: 1
    })

    // Step 8: Return recovery key to user — shown ONCE, never stored
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        recovery_key: recoveryKey.formatted
      },
      security_notice:
        'IMPORTANT: Save your recovery key now. It will NOT be shown again. ' +
        'If you lose both your password and recovery key, your data cannot be recovered.'
    })
  } catch (error) {
    console.error('Register error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error'
    })
  }
}

/**
 * POST /auth/login
 *
 * 1. Verify bcrypt hash
 * 2. Derive KEK from password
 * 3. Unwrap MEK using KEK
 * 4. Return JWT + MEK (hex) to client
 */
exports.login = async (req, res) => {
  try {
    const { email, master_password } = req.body

    if (!email || !master_password) {
      return res.status(401).json({
        success: false,
        message: 'Email and password are required'
      })
    }

    const user = await User.findOne({ where: { email } })
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    // Verify password with bcrypt
    const isValid = await bcrypt.compare(master_password, user.master_hash)
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    // Generate JWT
    const payload = { userId: user.id, email: user.email }
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' })

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    // If user is on MEK system, decrypt MEK and return to client
    let mekHex = null
    if (user.mek_version >= 1 && user.encrypted_mek_by_password) {
      const kek = await deriveKEK(master_password, user.kek_salt)
      const mek = unwrapMEK(
        user.encrypted_mek_by_password,
        kek,
        user.mek_pw_iv,
        user.mek_pw_tag
      )
      mekHex = mek.toString('hex')
    }

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
          mek_version: user.mek_version
        },
        // MEK is sent to client — client stores in memory for subsequent operations
        mek: mekHex
      }
    })
  } catch (err) {
    console.error('❌ Login error:', err.message)
    return res.status(401).json({
      success: false,
      message: err.message || 'Login failed'
    })
  }
}

/**
 * POST /auth/logout
 */
exports.logout = async (req, res) => {
  try {
    res.clearCookie('token')
    return res.json({ success: true, message: 'Logged out successfully' })
  } catch (err) {
    console.error('❌ Logout error:', err.message)
    return res.status(500).json({
      success: false,
      message: err.message || 'Logout failed'
    })
  }
}

/**
 * POST /auth/recover-password
 *
 * Account recovery flow:
 * 1. User provides email + recovery_key + new_password
 * 2. Parse recovery key → Buffer
 * 3. Unwrap MEK using recovery key
 * 4. Hash new password (bcrypt)
 * 5. Derive new KEK from new password (Argon2id)
 * 6. Re-wrap MEK with new KEK
 * 7. Update user record
 */
exports.recoverPassword = async (req, res) => {
  try {
    const { email, recovery_key, new_password } = req.body

    // Find user
    const user = await User.findOne({ where: { email } })
    if (!user) {
      // Don't reveal if email exists or not
      return res.status(400).json({
        success: false,
        message: 'Recovery failed. Please check your credentials.'
      })
    }

    // User must be on MEK system
    if (user.mek_version < 1 || !user.encrypted_mek_by_recovery) {
      return res.status(400).json({
        success: false,
        message:
          'Account recovery is not available. Please migrate your account first.'
      })
    }

    // Step 1: Parse recovery key
    let recoveryKeyBuffer
    try {
      recoveryKeyBuffer = parseRecoveryKey(recovery_key)
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid recovery key format'
      })
    }

    // Step 2: Unwrap MEK using recovery key
    let mek
    try {
      mek = unwrapMEK(
        user.encrypted_mek_by_recovery,
        recoveryKeyBuffer,
        user.mek_rc_iv,
        user.mek_rc_tag
      )
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid recovery key. Decryption failed.'
      })
    }

    // Step 3: Check new password against breaches
    const breachCount = await checkPasswordBreach(new_password)
    if (breachCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Password baru ditemukan ${breachCount} kali dalam kebocoran data publik. Gunakan password yang lebih aman.`
      })
    }

    // Step 4: Hash new password for authentication
    const saltRounds = 12
    const newPasswordHash = await bcrypt.hash(new_password, saltRounds)

    // Step 5: Derive new KEK from new password
    const newKekSalt = generateSalt()
    const newKek = await deriveKEK(new_password, newKekSalt)

    // Step 6: Re-wrap MEK with new KEK
    const newMekByPassword = wrapMEK(mek, newKek)

    // Step 7: Update user record
    await user.update({
      master_hash: newPasswordHash,
      kek_salt: newKekSalt,
      encrypted_mek_by_password: newMekByPassword.encrypted,
      mek_pw_iv: newMekByPassword.iv,
      mek_pw_tag: newMekByPassword.tag
      // encrypted_mek_by_recovery stays the same — recovery key unchanged
    })

    return res.json({
      success: true,
      message:
        'Password recovered successfully. You can now login with your new password.'
    })
  } catch (error) {
    console.error('Recovery error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Recovery failed'
    })
  }
}

/**
 * POST /auth/migrate-to-mek (authenticated)
 *
 * One-time migration for existing users:
 * 1. Verify master password
 * 2. Generate MEK + Recovery Key
 * 3. Decrypt all vault passwords & secret notes with old method
 * 4. Re-encrypt all data with MEK
 * 5. Wrap MEK with KEK and recovery key
 * 6. Update user record and all data
 * 7. Return recovery key ONCE
 */
exports.migrateToMEK = async (req, res) => {
  const t = await db.sequelize.transaction()
  try {
    const userId = req.user.userId
    const { master_password } = req.body

    // Find user
    const user = await User.findOne({
      where: { id: userId },
      transaction: t
    })

    if (!user) {
      await t.rollback()
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Already migrated
    if (user.mek_version >= 1) {
      await t.rollback()
      return res.status(400).json({
        success: false,
        message: 'Account already migrated to MEK system'
      })
    }

    // Verify master password
    const isValid = await bcrypt.compare(master_password, user.master_hash)
    if (!isValid) {
      await t.rollback()
      return res.status(401).json({
        success: false,
        message: 'Invalid master password'
      })
    }

    // Step 1: Generate MEK
    const mek = generateMEK()

    // Step 2: Derive KEK and wrap MEK
    const kekSalt = generateSalt()
    const kek = await deriveKEK(master_password, kekSalt)
    const mekByPassword = wrapMEK(mek, kek)

    // Step 3: Generate and wrap with recovery key
    const recoveryKey = generateRecoveryKey()
    const mekByRecovery = wrapMEK(mek, recoveryKey.raw)

    // Step 4: Migrate vault passwords
    const vaultPasswords = await db.VaultPassword.findAll({
      where: { user_id: userId },
      transaction: t
    })

    for (const vp of vaultPasswords) {
      try {
        // Decrypt with old method (Argon2id per-item)
        const encryptedObj = JSON.parse(vp.password_encrypted)
        const kdfParams = vp.kdf_params || {
          memoryCost: 2 ** 16,
          timeCost: 3,
          parallelism: 1
        }
        const plaintext = await decrypt(
          encryptedObj,
          master_password,
          kdfParams
        )

        // Re-encrypt with MEK (fast AES-256-GCM)
        const newEncrypted = encryptData(plaintext, mek)

        await db.sequelize.query(
          `UPDATE vault_passwords
           SET password_encrypted = :password_encrypted, updated_at = CURRENT_TIMESTAMP
           WHERE id = :id AND user_id = :userId`,
          {
            replacements: {
              password_encrypted: JSON.stringify(newEncrypted),
              id: vp.id,
              userId
            },
            type: db.sequelize.QueryTypes.UPDATE,
            transaction: t
          }
        )
      } catch (err) {
        console.error(
          `⚠️ Failed to migrate vault password ${vp.id}:`,
          err.message
        )
        // Continue with other items — log failures but don't abort entire migration
      }
    }

    // Step 5: Migrate secret notes
    const secretNotes = await db.SecretNote.findAll({
      where: { user_id: userId, deleted_at: null },
      transaction: t
    })

    for (const sn of secretNotes) {
      try {
        const encryptedObj = JSON.parse(sn.note)
        const kdfParams = sn.kdf_params || {
          memoryCost: 2 ** 16,
          timeCost: 3,
          parallelism: 1
        }
        const plaintext = await decrypt(
          encryptedObj,
          master_password,
          kdfParams
        )

        const newEncrypted = encryptData(plaintext, mek)

        await db.sequelize.query(
          `UPDATE secret_notes
           SET note = :note, updated_at = CURRENT_TIMESTAMP
           WHERE id = :id AND user_id = :userId AND deleted_at IS NULL`,
          {
            replacements: {
              note: JSON.stringify(newEncrypted),
              id: sn.id,
              userId
            },
            type: db.sequelize.QueryTypes.UPDATE,
            transaction: t
          }
        )
      } catch (err) {
        console.error(`⚠️ Failed to migrate secret note ${sn.id}:`, err.message)
      }
    }

    // Step 6: Update user record
    await user.update(
      {
        kek_salt: kekSalt,
        encrypted_mek_by_password: mekByPassword.encrypted,
        mek_pw_iv: mekByPassword.iv,
        mek_pw_tag: mekByPassword.tag,
        encrypted_mek_by_recovery: mekByRecovery.encrypted,
        mek_rc_iv: mekByRecovery.iv,
        mek_rc_tag: mekByRecovery.tag,
        mek_version: 1
      },
      { transaction: t }
    )

    await t.commit()

    return res.json({
      success: true,
      message: 'Account migrated to MEK system successfully',
      data: {
        recovery_key: recoveryKey.formatted,
        migrated_vault_passwords: vaultPasswords.length,
        migrated_secret_notes: secretNotes.length
      },
      security_notice:
        'IMPORTANT: Save your recovery key now. It will NOT be shown again. ' +
        'If you lose both your password and recovery key, your data cannot be recovered.'
    })
  } catch (error) {
    await t.rollback()
    console.error('Migration error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Migration failed'
    })
  }
}
