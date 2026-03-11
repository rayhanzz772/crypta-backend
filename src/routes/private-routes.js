const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middleware/authMiddleware')
const { privateLimiter } = require('../middleware/rateLimiter')

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
router.use('/activity', authMiddleware, require('../modules/log/index'))

module.exports = router
