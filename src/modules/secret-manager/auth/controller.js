const jwt = require('jsonwebtoken')

async function issueToken(req, res) {
  const { ServiceAccount } = req.models
  const { assertion } = req.body || {}

  if (!assertion) {
    return res.status(400).json({ message: 'assertion is required' })
  }

  let decoded
  try {
    decoded = jwt.decode(assertion)
  } catch {
    return res.status(400).json({ message: 'invalid assertion format' })
  }

  const client_id = decoded && decoded.iss
  const aud = decoded && decoded.aud

  if (!client_id) {
    return res.status(400).json({ message: 'assertion.iss is required' })
  }

  if (!aud) {
    return res.status(400).json({ message: 'assertion.aud is required' })
  }

  if (aud !== process.env.AUTH_AUDIENCE) {
    return res.status(401).json({ message: 'invalid audience' })
  }

  console.log(aud)

  const sa = await ServiceAccount.findOne({
    where: {
      client_id,
      status: 'active'
    }
  })

  if (!sa || !sa.public_key) {
    return res
      .status(401)
      .json({ message: 'service account not found or disabled' })
  }

  try {
    jwt.verify(assertion, sa.public_key, {
      algorithms: ['RS256'],
      audience: process.env.AUTH_AUDIENCE,
      issuer: client_id
    })
  } catch (e) {
    return res.status(401).json({
      message: 'assertion verification failed',
      detail: e.message
    })
  }

  const access_token = jwt.sign(
    {
      service_account_id: sa.id,
      project_id: sa.project_id,
      client_id: sa.client_id,
      scope: ['secret.access']
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: process.env.ACCESS_TOKEN_TTL || '10m'
    }
  )

  return res.json({
    token_type: 'Bearer',
    access_token,
    expires_in: process.env.ACCESS_TOKEN_TTL || '10m'
  })
}

module.exports = { issueToken }
