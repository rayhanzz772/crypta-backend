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
const Detection = require('../../services/detection')
const {
  buildFeatureVector
} = require('../../services/featureExtractionService')
const { predictAnomaly } = require('../../services/apiPredict')
const { sendMail } = require('../../utils/mailer')
const { verificationEmailTemplate } = require('../../utils/emailTemplates')

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
      mek_version: 1,
      is_verified: false
    })

    // Generate 6-digit verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await user.update({
      verification_code: verificationCode,
      verification_expires_at: expiresAt
    })

    // Send verification email (non-blocking — don't fail registration if email fails)
    sendMail({
      to: email,
      subject: 'Verify your Crypta account',
      html: verificationEmailTemplate(verificationCode)
    }).catch((err) =>
      console.error('[Mailer] Failed to send verification email:', err.message)
    )

    return res.status(201).json({
      success: true,
      message:
        'Registration successful. Please check your email for the verification code.',
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

async function handleRiskTrigger(riskLevel, sessionId, user) {
  switch (riskLevel?.toLowerCase()) {
    case 'low':
      console.log(
        `[RISK:LOW] User ${user.email} logged in with low anomaly risk. No action taken.`
      )
      break

    case 'medium':
      console.warn(
        `[RISK:MEDIUM] Suspicious login detected for ${user.email}. Flagging session.`
      )
      await db.LoginHistory.update(
        { is_flagged: true },
        { where: { id: sessionId } }
      )
      break

    case 'high':
      console.error(
        `[RISK:HIGH] High-risk login detected for ${user.email}. Flagging and blocking session.`
      )
      await db.LoginHistory.update(
        { is_flagged: true, status: 'blocked' },
        { where: { id: sessionId } }
      )
      break

    default:
      console.log(`[RISK:UNKNOWN] Unrecognized risk level: ${riskLevel}`)
  }
}

exports.login = async (req, res) => {
  try {
    const { email, master_password } = req.body
    const ipLocation = await Detection.getClientIP(req)
    const loginTime = new Date()
    const getLocation = await Detection.getLocation(ipLocation)

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

    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        message:
          'Email not verified. Please check your inbox for the verification code.'
      })
    }

    let isVpn = false
    try {
      if (req.ip && req.ip !== '::1' && req.ip !== '127.0.0.1') {
        isVpn = (await Detection.checkVPN(req.ip)) === 1
      }
    } catch (err) {
      console.error('VPN check error:', err.message)
    }

    const isValid = await bcrypt.compare(master_password, user.master_hash)
    if (!isValid) {
      await db.LoginHistory.create({
        user_id: user.id,
        login_time: new Date(),
        ip_address: req.ip,
        device: req.headers['user-agent'],
        location: getLocation.city || 'Semarang',
        vpn_used: isVpn,
        status: 'failed'
      })

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    const loginHistory = await db.LoginHistory.create({
      user_id: user.id,
      login_time: loginTime,
      ip_address: req.ip,
      device: req.headers['user-agent'],
      location: getLocation.city || 'Semarang',
      vpn_used: isVpn,
      status: 'success'
    })

    const payload = {
      userId: user.id,
      email: user.email,
      sessionId: loginHistory.id
    }
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' })

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    await user.update({
      last_login_at: loginTime,
      last_ip: req.ip,
      last_location: getLocation.city || 'Semarang',
      last_device: req.headers['user-agent']
    })

    buildFeatureVector(user.id, loginTime, req.ip)
      .then(async (features) => {
        const anomalyLog = await db.AnomalyLog.create({
          id: require('cuid')(),
          user_id: user.id,
          ...features
        })

        try {
          const mlResponse = await predictAnomaly(features)
          console.log('mlResponse', mlResponse)

          await anomalyLog.update({
            anomaly_score: mlResponse.score,
            risk_level: mlResponse.risk_level,
            prediction: mlResponse.status
          })

          console.log('ML Anomaly Result saved to db')

          await handleRiskTrigger(mlResponse.risk_level, loginHistory.id, user)
        } catch (mlErr) {
          console.error('ML API Error:', mlErr.message)
        }
      })
      .catch((err) => {
        console.error(
          'Failed to extract and save anomaly features:',
          err.message
        )
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
    const tokenStr =
      req.cookies?.token || req.headers.authorization?.split(' ')[1]

    if (tokenStr) {
      try {
        const decoded = jwt.verify(tokenStr, process.env.JWT_SECRET)
        if (decoded.sessionId) {
          await db.LoginHistory.update(
            { last_active_at: new Date() },
            { where: { id: decoded.sessionId } }
          )
        }
      } catch (jwtErr) {
        console.warn('Silent fail extracting jwt on logout:', jwtErr.message)
      }
    }

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

exports.verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body

    const user = await User.findOne({ where: { email } })
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      })
    }

    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        message: 'This email is already verified'
      })
    }

    const now = new Date()
    const isExpired =
      !user.verification_expires_at ||
      now > new Date(user.verification_expires_at)
    const isInvalid = user.verification_code !== code

    if (isExpired || isInvalid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      })
    }

    await user.update({
      is_verified: true,
      verification_code: null,
      verification_expires_at: null
    })

    return res.json({
      success: true,
      message: 'Email verified successfully. You can now log in.'
    })
  } catch (error) {
    console.error('Verify email error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error'
    })
  }
}

exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body

    const user = await User.findOne({ where: { email } })
    if (!user) {
      // Return success to avoid email enumeration
      return res.json({
        success: true,
        message:
          'If this email is registered and unverified, a new code has been sent.'
      })
    }

    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        message: 'This email is already verified'
      })
    }

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await user.update({
      verification_code: verificationCode,
      verification_expires_at: expiresAt
    })

    sendMail({
      to: email,
      subject: 'Your new Crypta verification code',
      html: verificationEmailTemplate(verificationCode)
    }).catch((err) =>
      console.error(
        '[Mailer] Failed to resend verification email:',
        err.message
      )
    )

    return res.json({
      success: true,
      message:
        'If this email is registered and unverified, a new code has been sent.'
    })
  } catch (error) {
    console.error('Resend verification error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error'
    })
  }
}
