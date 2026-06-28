const Controller = require('./controller')
const router = require('express').Router()
const { authMiddleware } = require('../../middleware/authMiddleware')
const validateRequest = require('../../middleware/validateRequest')
const { loginLimiter, recoveryLimiter } = require('../../middleware/rateLimiter')
const {
  loginSchema,
  registerSchema,
  verifyRecoverySchema,
  verifyRecoveryOtpSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema
} = require('./schema')

router.get('/salt', Controller.getSalt)
router.post('/login', validateRequest({ body: loginSchema }), Controller.login)
router.post('/logout', Controller.logout)
router.post(
  '/register',
  loginLimiter,
  validateRequest({ body: registerSchema }),
  Controller.register
)

router.get('/me', authMiddleware, Controller.getMe)

router.post(
  '/verify-recovery-key',
  recoveryLimiter,
  validateRequest({ body: verifyRecoverySchema }),
  Controller.verifyRecoveryKey
)
router.post(
  '/verify-recovery-otp',
  recoveryLimiter,
  validateRequest({ body: verifyRecoveryOtpSchema }),
  Controller.verifyRecoveryOtp
)
router.post(
  '/reset-password',
  recoveryLimiter,
  validateRequest({ body: resetPasswordSchema }),
  Controller.resetPassword
)

router.post(
  '/verify-email',
  loginLimiter,
  validateRequest({ body: verifyEmailSchema }),
  Controller.verifyEmail
)

router.post(
  '/resend-verification',
  loginLimiter,
  validateRequest({ body: resendVerificationSchema }),
  Controller.resendVerification
)

module.exports = router
