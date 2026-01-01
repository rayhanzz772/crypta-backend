const express = require('express')
const router = express.Router()
const validateRequest = require('../../../middleware/validateRequest')
const {
  createBindingSchema,
  bindingParamsSchema,
  secretParamsSchema,
  listBindingsQuerySchema
} = require('./schema')

const { createBinding, listBindings, deleteBinding } = require('./controller')

router.post(
  '/:secret_id/create',
  validateRequest({ body: createBindingSchema, params: secretParamsSchema }),
  createBinding
)

router.get(
  '/',
  validateRequest({ query: listBindingsQuerySchema }),
  listBindings
)

router.delete(
  '/:binding_id/delete',
  validateRequest({ params: bindingParamsSchema }),
  deleteBinding
)

module.exports = router
