const express = require('express')
const router = express.Router()
const validateRequest = require('../../../middleware/validateRequest')
const { createSecretVersionSchema, secretParamsSchema } = require('./schema')

const { createSecretVersion, listSecretVersions } = require('./controller')

router.post(
  '/:secret_id/create',
  validateRequest({
    body: createSecretVersionSchema,
    params: secretParamsSchema
  }),
  createSecretVersion
)

router.get(
  '/:secret_id/list',
  validateRequest({ params: secretParamsSchema }),
  listSecretVersions
)

module.exports = router
