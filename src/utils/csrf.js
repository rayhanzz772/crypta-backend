/**
 * Modern CSRF protection via Origin header validation.
 * Only applies to requests authenticated via cookies (not Bearer tokens).
 * Bearer token requests are inherently safe from CSRF.
 */

const TRUSTED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'https://crypta.rayhancreative.web.id',
  'https://www.crypta.rayhancreative.web.id',
  'https://crypta-frontend.vercel.app'
]

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']

function csrfProtection(req, res, next) {
  // Skip safe methods
  if (SAFE_METHODS.includes(req.method)) {
    return next()
  }

  // Skip if request is authenticated via Bearer token (not vulnerable to CSRF)
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next()
  }

  // Skip if no cookie is present (not a cookie-authenticated request)
  if (!req.cookies?.token) {
    return next()
  }

  // For cookie-authenticated state-changing requests, validate Origin
  const origin = req.headers.origin || req.headers.referer

  if (!origin) {
    return res.status(403).json({
      success: false,
      message: 'Missing Origin header for cookie-authenticated request'
    })
  }

  try {
    const originUrl = new URL(origin)
    const originBase = `${originUrl.protocol}//${originUrl.host}`

    const isTrusted =
      TRUSTED_ORIGINS.includes(originBase) ||
      originUrl.hostname === 'localhost' ||
      originUrl.hostname === '127.0.0.1' ||
      originUrl.hostname.endsWith('.rayhancreative.web.id')

    if (!isTrusted) {
      return res.status(403).json({
        success: false,
        message: 'CSRF validation failed: untrusted origin'
      })
    }
  } catch (e) {
    return res.status(403).json({
      success: false,
      message: 'CSRF validation failed: invalid origin'
    })
  }

  next()
}

module.exports = csrfProtection
