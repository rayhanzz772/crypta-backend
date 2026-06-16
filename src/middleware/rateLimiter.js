const rateLimit = require('express-rate-limit')

const privateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.'
  },
  keyGenerator: (req) => {
    if (req.user?.userId) return req.user.userId
    return undefined
  }
})

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this API key. Try again later.'
  },
  keyGenerator: (req) => {
    const apiKey = req.headers['x-api-key']
    if (apiKey) return apiKey
    return undefined
  }
})

/**
 * Strict rate limiter for authentication endpoints (login, register, reset-password, etc.)
 * 5 attempts per 15 minutes per IP to prevent brute-force attacks.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // 5 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // disable IPv6 keyGenerator validation warning
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.'
  },
  keyGenerator: (req) => {
    // Key by IP address (since user is not yet authenticated)
    return req.ip || req.connection.remoteAddress || 'unknown'
  }
})

/**
 * Recovery and password reset limiter — more restrictive.
 * 3 attempts per 30 minutes per IP.
 */
const recoveryLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // disable IPv6 keyGenerator validation warning
  message: {
    success: false,
    message: 'Too many recovery/reset attempts. Please try again after 30 minutes.'
  },
  keyGenerator: (req) => req.ip || req.connection.remoteAddress || 'unknown'
})

module.exports = { privateLimiter, publicLimiter, loginLimiter, recoveryLimiter }
