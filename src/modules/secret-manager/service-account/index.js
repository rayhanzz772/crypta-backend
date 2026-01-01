// src/modules/service-account/routes.js
const express = require('express')
const router = express.Router()

const {
  createServiceAccount,
  listServiceAccounts,
  deleteServiceAccount
} = require('./controller')

router.post('/:project_id/create', createServiceAccount)

router.get('/:project_id/list', listServiceAccounts)

router.delete('/:service_account_id/delete', deleteServiceAccount)

module.exports = router
