const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middleware/authMiddleware')
const { privateLimiter } = require('../middleware/rateLimiter')
const injectModels = require('../middleware/injectModels')
const models = require('../../db/models')

router.use(privateLimiter)

router.use(injectModels(models))

router.use('/auth', require('../modules/secret-manager/auth/index'))

router.use(
  '/latest-secret',
  require('../modules/secret-manager/latest-secret/index')
)
router.use('/project-secret', require('../modules/secret-manager/project'))

router.use(
  '/service-account',
  require('../modules/secret-manager/service-account/index')
)

router.use('/secret', require('../modules/secret-manager/secret/index'))

router.use(
  '/service-version',
  require('../modules/secret-manager/secret-version/index')
)

router.use('/bindings', require('../modules/secret-manager/iam-binding/index'))

module.exports = router
