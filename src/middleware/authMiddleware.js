require('dotenv').config()
const jwt = require('jsonwebtoken')
const db = require('../../db/models')
const { isTokenBlacklisted } = require('../utils/tokenBlacklist')

const authMiddleware = async (req, res, next) => {
  // Read token from httpOnly cookie first, then fall back to Authorization header
  const cookieToken = req.cookies?.token
  const authHeader = req.headers.authorization
  const headerToken =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null

  const token = cookieToken || headerToken

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    })
  }
  try {
    // Verifikasi token
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })

    // Check if token has been revoked (logged out)
    if (isTokenBlacklisted(token)) {
      return res.status(401).json({
        success: false,
        errorCode: 'TOKEN_REVOKED',
        message: 'Token has been revoked. Please log in again.'
      })
    }

    const user = await db.User.findByPk(decoded.userId)
    if (!user || user.is_blocked) {
      const isProduction = process.env.NODE_ENV === 'production'
      res.clearCookie('token', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        domain: isProduction ? process.env.COOKIE_DOMAIN : undefined
      })

      return res.status(403).json({
        success: false,
        errorCode: 'ACCOUNT_BLOCKED',
        message:
          'Your account is temporarily blocked due to suspicious activity. Please reset your password.'
      })
    }

    req.user = {
      userId: user.id,
      email: user.email
    }

    db.LogActivity.create({
      user_id: user.id,
      endpoint: req.originalUrl || req.url,
      method: req.method,
      ip_address: req.ip || req.connection.remoteAddress,
      device: req.headers['user-agent']
    }).catch((err) => console.error('Error logging activity:', err.message))

    if (decoded.sessionId) {
      db.LoginHistory.update(
        { last_active_at: new Date() },
        { where: { id: decoded.sessionId } }
      ).catch((err) =>
        console.error('Error tracking session heartbeat:', err.message)
      )
    }

    next()
  } catch (err) {
    console.error('JWT verification error:', err.message)
    return res.status(401).json({
      success: false,
      message:
        err.name === 'TokenExpiredError'
          ? 'Token expired'
          : err.name === 'JsonWebTokenError'
            ? 'Invalid token'
            : 'Token verification failed'
    })
  }
}

const apiKeyAuth = async (req, res, next) => {
  const key = req.headers['x-api-key']
  if (!key) return res.status(401).json({ message: 'Missing API key' })

  const record = await db.ApiKey.findOne({ where: { key, revoked: false } })
  if (!record)
    return res.status(403).json({ message: 'Invalid or revoked API key' })

  req.user = { userId: record.user_id }

  // Log the API key authenticated request asynchronously
  db.LogActivity.create({
    user_id: record.user_id,
    endpoint: req.originalUrl || req.url,
    method: req.method,
    ip_address: req.ip || req.connection.remoteAddress,
    device: req.headers['user-agent']
  }).catch((err) =>
    console.error('Error logging API key activity:', err.message)
  )

  next()
}

module.exports = { authMiddleware, apiKeyAuth }
