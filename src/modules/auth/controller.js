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

exports.register = async (req, res) => {
  try {
    const { email, master_password } = req.body

    if (!email || !master_password) {
      return res.status(400).json({
        success: false,
        message: 'Email and master_password are required'
      })
    }

    const existingUser = await User.findOne({ where: { email } })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      })
    }

    const breachCount = await checkPasswordBreach(master_password)
    if (breachCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Password ini ditemukan ${breachCount} kali dalam kebocoran data publik. Gunakan password yang lebih aman.`
      })
    }

    const saltRounds = 12
    const passwordHash = await bcrypt.hash(master_password, saltRounds)

    const mek = generateMEK()

    const kekSalt = generateSalt()
    const kek = await deriveKEK(master_password, kekSalt)

    const mekByPassword = wrapMEK(mek, kek)

    const recoveryKey = generateRecoveryKey()

    const mekByRecovery = wrapMEK(mek, recoveryKey.raw)

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

    const isValid = await bcrypt.compare(master_password, user.master_hash)
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    const payload = { userId: user.id, email: user.email }
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' })

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

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

exports.verifyRecoveryKey = async (req, res) => {
  try {
    const { email, recovery_key } = req.body

    const user = await User.findOne({ where: { email } })
    if (!user || user.mek_version < 1 || !user.encrypted_mek_by_recovery) {
      return res.status(400).json({
        success: false,
        message: 'Recovery is not available for this account'
      })
    }

    const recoveryKeyBuffer = parseRecoveryKey(recovery_key)
    const mek = unwrapMEK(
      user.encrypted_mek_by_recovery,
      recoveryKeyBuffer,
      user.mek_rc_iv,
      user.mek_rc_tag
    )

    req.session.recovery_mek = mek.toString('hex')
    req.session.recovery_user_id = user.id

    return res.json({
      success: true,
      message: 'Recovery key verified successfully. Proceed to reset password.'
    })
  } catch (error) {
    console.error('Verify Recovery error:', error)
    return res.status(400).json({
      success: false,
      message: 'Invalid recovery key or email'
    })
  }
}

exports.resetPassword = async (req, res) => {
  try {
    const { new_password } = req.body
    const { recovery_mek, recovery_user_id } = req.session

    if (!recovery_mek || !recovery_user_id) {
      return res.status(400).json({
        success: false,
        message:
          'Recovery session expired. Please verify your recovery key again.'
      })
    }

    const user = await User.findByPk(recovery_user_id)
    if (!user) throw new Error('User not found')

    const breachCount = await checkPasswordBreach(new_password)
    if (breachCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Password found in data breaches. Please choose another.'
      })
    }

    const mek = Buffer.from(recovery_mek, 'hex')
    const passwordHash = await bcrypt.hash(new_password, 12)
    const kekSalt = generateSalt()
    const kek = await deriveKEK(new_password, kekSalt)
    const mekByPassword = wrapMEK(mek, kek)

    await user.update({
      master_hash: passwordHash,
      kek_salt: kekSalt,
      encrypted_mek_by_password: mekByPassword.encrypted,
      mek_pw_iv: mekByPassword.iv,
      mek_pw_tag: mekByPassword.tag
    })

    req.session.destroy()

    return res.json({
      success: true,
      message: 'Password reset successfully. You can now login.'
    })
  } catch (error) {
    console.error('Reset Password error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Reset failed'
    })
  }
}

exports.migrateToMEK = async (req, res) => {
  const t = await db.sequelize.transaction()
  try {
    const userId = req.user.userId
    const { master_password } = req.body

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

    if (user.mek_version >= 1) {
      await t.rollback()
      return res.status(400).json({
        success: false,
        message: 'Account already migrated to MEK system'
      })
    }

    const isValid = await bcrypt.compare(master_password, user.master_hash)
    if (!isValid) {
      await t.rollback()
      return res.status(401).json({
        success: false,
        message: 'Invalid master password'
      })
    }

    const mek = generateMEK()

    const kekSalt = generateSalt()
    const kek = await deriveKEK(master_password, kekSalt)
    const mekByPassword = wrapMEK(mek, kek)

    const recoveryKey = generateRecoveryKey()
    const mekByRecovery = wrapMEK(mek, recoveryKey.raw)

    const vaultPasswords = await db.VaultPassword.findAll({
      where: { user_id: userId },
      transaction: t
    })

    for (const vp of vaultPasswords) {
      try {
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
      }
    }

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
