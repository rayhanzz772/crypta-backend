const Controller = require('./controller')
const router = require('express').Router()
const { authMiddleware } = require('../../middleware/authMiddleware')
const validateRequest = require('../../middleware/validateRequest')
const {
  loginSchema,
  registerSchema,
  verifyRecoverySchema,
  resetPasswordSchema,
  migrateToMekSchema,
  verifyEmailSchema,
  resendVerificationSchema
} = require('./schema')

router.post('/login', validateRequest({ body: loginSchema }), Controller.login)
router.post('/logout', Controller.logout)
router.post(
  '/register',
  validateRequest({ body: registerSchema }),
  Controller.register
)

router.post(
  '/verify-recovery-key',
  validateRequest({ body: verifyRecoverySchema }),
  Controller.verifyRecoveryKey
)
router.post(
  '/reset-password',
  validateRequest({ body: resetPasswordSchema }),
  Controller.resetPassword
)

router.post(
  '/migrate-to-mek',
  authMiddleware,
  validateRequest({ body: migrateToMekSchema }),
  Controller.migrateToMEK
)

router.post(
  '/verify-email',
  validateRequest({ body: verifyEmailSchema }),
  Controller.verifyEmail
)

router.post(
  '/resend-verification',
  validateRequest({ body: resendVerificationSchema }),
  Controller.resendVerification
)

module.exports = router
