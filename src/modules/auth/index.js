const Controller = require('./controller')
const router = require('express').Router()
const { authMiddleware } = require('../../middleware/authMiddleware')
const validateRequest = require('../../middleware/validateRequest')
const {
  loginSchema,
  registerSchema,
  verifyRecoverySchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema
} = require('./schema')

router.get('/salt', Controller.getSalt)
router.post('/login', validateRequest({ body: loginSchema }), Controller.login)
router.post('/logout', Controller.logout)
router.post(
  '/register',
  validateRequest({ body: registerSchema }),
  Controller.register
)

router.get('/me', authMiddleware, Controller.getMe)

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
