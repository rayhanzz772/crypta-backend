const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middleware/authMiddleware')
const { privateLimiter } = require('../middleware/rateLimiter')
const injectModels = require('../middleware/injectModels')
const models = require('../../db/models')

router.use(privateLimiter)
router.get('/status', (req, res) => {
  res.send('Running ⚡')
})

router.use('/users', authMiddleware, require('../modules/user/index'))
router.use('/categories', authMiddleware, require('../modules/category/index'))
router.use('/vault', authMiddleware, require('../modules/vault-password/index'))
router.use('/notes', authMiddleware, require('../modules/secret-note/index'))
router.use('/tags', authMiddleware, require('../modules/tag/index'))
router.use('/developer', authMiddleware, require('../modules/developer/index'))

module.exports = router
