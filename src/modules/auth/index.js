const Controller = require('./controller')
const router = require('express').Router()
const { authMiddleware } = require('../../middleware/authMiddleware')
const validateRequest = require('../../middleware/validateRequest')
const {
  loginSchema,
  registerSchema,
  recoverPasswordSchema,
  migrateToMekSchema
} = require('./schema')

router.post('/login', validateRequest({ body: loginSchema }), Controller.login)
router.post('/logout', Controller.logout)
router.post(
  '/register',
  validateRequest({ body: registerSchema }),
  Controller.register
)

// Recovery: user provides recovery_key + new_password (no auth needed)
router.post(
  '/recover-password',
  validateRequest({ body: recoverPasswordSchema }),
  Controller.recoverPassword
)

// Migration: convert existing legacy-encrypted data to MEK system (auth required)
router.post(
  '/migrate-to-mek',
  authMiddleware,
  validateRequest({ body: migrateToMekSchema }),
  Controller.migrateToMEK
)

module.exports = router
