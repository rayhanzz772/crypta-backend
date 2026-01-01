const rateLimit = require('express-rate-limit')

const privateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests (private route). Please slow down.'
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

module.exports = { privateLimiter, publicLimiter }
