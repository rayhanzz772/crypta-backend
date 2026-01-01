const Controller = require('./controller')
const router = require('express').Router()
const validateRequest = require('../../middleware/validateRequest')
const { checkPasswordSchema, getUsersQuerySchema } = require('./schema')

router.get(
  '/',
  validateRequest({ query: getUsersQuerySchema }),
  Controller.getUser
)
router.post(
  '/check-password',
  validateRequest({ body: checkPasswordSchema }),
  Controller.checkPassword
)

module.exports = router
