const Controller = require('./controller')
const router = require('express').Router()
const validateRequest = require('../../middleware/validateRequest')
const { loginSchema, registerSchema } = require('./schema')

router.post('/login', validateRequest({ body: loginSchema }), Controller.login)
router.post('/logout', Controller.logout)
router.post(
  '/register',
  validateRequest({ body: registerSchema }),
  Controller.register
)

module.exports = router
