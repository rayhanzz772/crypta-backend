const jwt = require('jsonwebtoken')

function authenticateServiceAccount(req, res, next) {
  const auth = req.headers.authorization || ''
  const [type, token] = auth.split(' ')

  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'missing bearer token' })
  }

  try {
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {
      algorithms: ['HS256']
    })

    req.auth = {
      service_account_id: payload.service_account_id,
      project_id: payload.project_id,
      client_id: payload.client_id,
      scope: payload.scope || []
    }

    return next()
  } catch (e) {
    return res.status(401).json({ message: 'invalid token', detail: e.message })
  }
}

module.exports = authenticateServiceAccount
