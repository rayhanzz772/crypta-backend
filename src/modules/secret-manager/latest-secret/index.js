const express = require('express')
const { accessLatestSecret } = require('./controller')
const authenticateServiceAccount = require('../../../middleware/authenticateServiceAccount')

const router = express.Router()

router.get(
  '/v1/secrets/:name/versions/latest:access',
  authenticateServiceAccount,
  accessLatestSecret
)

module.exports = router
