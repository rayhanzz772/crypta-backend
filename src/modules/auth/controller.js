const jwt = require('jsonwebtoken')
const db = require('../../../db/models')
const User = db.User
const bcrypt = require('bcrypt')
const { checkPasswordBreach } = require('../../utils/pwnedCheck')
const {
  generateRecoveryKey,
  parseRecoveryKey
} = require('../../utils/recovery-key')
const Detection = require('../../services/detection')
const {
  buildFeatureVector
} = require('../../services/featureExtractionService')
const { predictAnomaly } = require('../../services/apiPredict')
const { sendMail } = require('../../utils/mailer')
const { verificationEmailTemplate } = require('../../utils/emailTemplates')
const { handleRiskTrigger } = require('../../services/triggerRisk')
const HttpStatusCode = require('axios').HttpStatusCode
const { api } = require('../../utils/api')

exports.getSalt = async (req, res) => {
  try {
    const { email } = req.query
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' })
    }
    const user = await User.findOne({ where: { email } })
    if (!user || !user.kek_salt) {
      return res.status(404).json({ success: false, message: 'Salt not found' })
    }
    return res.json({ success: true, data: { kek_salt: user.kek_salt } })
  } catch (error) {
    console.error('getSalt error:', error)
    return res.status(500).json({ success: false, message: 'Internal Server Error' })
  }
}

exports.register = async (req, res) => {
  try {
    const { 
      email, 
      master_hash,
      kek_salt,
      encrypted_mek_by_password,
      mek_pw_iv,
      mek_pw_tag,
      encrypted_mek_by_recovery,
      mek_rc_iv,
      mek_rc_tag
    } = req.body

    const existingUser = await User.findOne({ where: { email } })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      })
    }

    const saltRounds = 12
    const passwordHash = await bcrypt.hash(master_hash, saltRounds)

    const user = await User.create({
      email,
      master_hash: passwordHash,
      kek_salt,
      encrypted_mek_by_password: Buffer.from(encrypted_mek_by_password, 'hex'),
      mek_pw_iv: Buffer.from(mek_pw_iv, 'hex'),
      mek_pw_tag: Buffer.from(mek_pw_tag, 'hex'),
      encrypted_mek_by_recovery: Buffer.from(encrypted_mek_by_recovery, 'hex'),
      mek_rc_iv: Buffer.from(mek_rc_iv, 'hex'),
      mek_rc_tag: Buffer.from(mek_rc_tag, 'hex'),
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
        createdAt: user.createdAt
      }
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
    const { email, master_hash } = req.body
    const ipLocation = await Detection.getClientIP(req)
    const loginTime = new Date()
    const getLocation = await Detection.getLocation(ipLocation)

    if (!email || !master_hash) {
      return res.status(401).json({
        success: false,
        message: 'Email and master_hash are required'
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

    if (user.is_blocked) {
      return res.status(403).json({
        success: false,
        message:
          'Your account has been blocked due to suspicious activity. ' +
          'Please reset your password using your recovery key to regain access.'
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

    const isValid = await bcrypt.compare(master_hash, user.master_hash)
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

    const isProduction = process.env.NODE_ENV === 'production'
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,                              // HTTPS only in prod
      sameSite: isProduction ? 'none' : 'lax',          // 'none' required for cross-origin in prod
      domain: isProduction ? process.env.COOKIE_DOMAIN : undefined, // e.g. '.rayhanprojects.site'
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    await user.update({
      last_login_at: loginTime,
      last_ip: req.ip,
      last_location: getLocation.city || 'Semarang',
      last_device: req.headers['user-agent']
    })

    buildFeatureVector(user.id, loginTime, req.ip, user.recovered_at)
      .then(async (features) => {
        const anomalyLog = await db.AnomalyLog.create({
          id: require('cuid')(),
          user_id: user.id,
          ...features
        })

        try {
          const mlResponse = await predictAnomaly(features)
          console.log(mlResponse)
          await anomalyLog.update({
            anomaly_score: mlResponse.score,
            risk_level: mlResponse.risk_level,
            prediction: mlResponse.status
          })

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

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          mek_version: user.mek_version
        },
        mek_data: {
          kek_salt: user.kek_salt,
          encrypted_mek_by_password: user.encrypted_mek_by_password ? user.encrypted_mek_by_password.toString('hex') : null,
          mek_pw_iv: user.mek_pw_iv ? user.mek_pw_iv.toString('hex') : null,
          mek_pw_tag: user.mek_pw_tag ? user.mek_pw_tag.toString('hex') : null
        }
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

exports.getMe = async (req, res) => {
  try {
    const userId = req.user?.userId
    const email = req.user?.email

    if (!userId && !email) {
      return res.status(HttpStatusCode.Unauthorized).json(
        api(null, HttpStatusCode.Unauthorized, {
          err: new Error('Authentication required')
        })
      )
    }

    const user = await db.User.findOne({
      where: userId ? { id: userId } : { email },
      attributes: [
        'id',
        'email',
        'is_verified',
        'is_blocked',
        'last_login_at',
        'last_ip',
        'last_location',
        'last_device'
      ]
    })

    if (!user) {
      return res
        .status(HttpStatusCode.NotFound)
        .json(api(null, HttpStatusCode.NotFound, { message: 'User not found' }))
    }

    return res.status(200).json(api(user))
  } catch (err) {
    console.error('getMe error:', err)
    const code = err?.code ?? HttpStatusCode.InternalServerError
    return res.status(code).json(api(null, code, { err }))
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
    const { email } = req.body

    const user = await User.findOne({ where: { email } })
    if (!user || user.mek_version < 1 || !user.encrypted_mek_by_recovery) {
      return res.status(400).json({
        success: false,
        message: 'Recovery is not available for this account'
      })
    }

    return res.json({
      success: true,
      data: {
        encrypted_mek_by_recovery: user.encrypted_mek_by_recovery.toString('hex'),
        mek_rc_iv: user.mek_rc_iv.toString('hex'),
        mek_rc_tag: user.mek_rc_tag.toString('hex')
      }
    })
  } catch (error) {
    console.error('Verify Recovery error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}

exports.resetPassword = async (req, res) => {
  try {
    const { 
      email,
      new_master_hash, 
      new_kek_salt, 
      encrypted_mek_by_password, 
      mek_pw_iv, 
      mek_pw_tag 
    } = req.body

    const user = await User.findOne({ where: { email } })
    if (!user) throw new Error('User not found')

    const passwordHash = await bcrypt.hash(new_master_hash, 12)

    await user.update({
      master_hash: passwordHash,
      kek_salt: new_kek_salt,
      encrypted_mek_by_password: Buffer.from(encrypted_mek_by_password, 'hex'),
      mek_pw_iv: Buffer.from(mek_pw_iv, 'hex'),
      mek_pw_tag: Buffer.from(mek_pw_tag, 'hex'),
      is_blocked: false,
      recovered_at: new Date()
    })

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

// migrateToMEK removed as migration must be handled purely on frontend

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
