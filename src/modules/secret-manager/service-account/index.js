// src/modules/service-account/routes.js
const express = require('express')
const router = express.Router()
const validateRequest = require('../../../middleware/validateRequest')
const {
  createServiceAccountSchema,
  serviceAccountParamsSchema,
  projectParamsSchema
} = require('./schema')

const {
  createServiceAccount,
  listServiceAccounts,
  deleteServiceAccount
} = require('./controller')

router.post(
  '/:project_id/create',
  validateRequest({
    body: createServiceAccountSchema,
    params: projectParamsSchema
  }),
  createServiceAccount
)

router.get(
  '/:project_id/list',
  validateRequest({ params: projectParamsSchema }),
  listServiceAccounts
)

router.delete(
  '/:service_account_id/delete',
  validateRequest({ params: serviceAccountParamsSchema }),
  deleteServiceAccount
)

module.exports = router
