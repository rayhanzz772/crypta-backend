const express = require('express')
const router = express.Router()
const validateRequest = require('../../../middleware/validateRequest')
const {
  createSecretSchema,
  secretParamsSchema,
  projectParamsSchema
} = require('./schema')

const {
  createSecret,
  listSecrets,
  getSecret,
  deleteSecret
} = require('./controller')

router.post(
  '/:project_id/create',
  validateRequest({ body: createSecretSchema, params: projectParamsSchema }),
  createSecret
)

router.get(
  '/:project_id/list',
  validateRequest({ params: projectParamsSchema }),
  listSecrets
)

router.get(
  '/:secret_id/show',
  validateRequest({ params: secretParamsSchema }),
  getSecret
)

router.delete(
  '/:secret_id/delete',
  validateRequest({ params: secretParamsSchema }),
  deleteSecret
)

module.exports = router
