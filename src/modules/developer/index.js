const router = require('express').Router()
const Controller = require('./controller')
const validateRequest = require('../../middleware/validateRequest')
const { idParamSchema } = require('./schema')

router.post('/generate-key', Controller.GenerateKey)
router.get('/api-keys', Controller.GetApiKeys)
router.delete(
  '/revoke-key/:id',
  validateRequest({ params: idParamSchema }),
  Controller.RevokeApiKey
)

module.exports = router
