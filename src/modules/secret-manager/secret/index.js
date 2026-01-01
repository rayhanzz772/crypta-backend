const express = require('express')
const router = express.Router()

const {
  createSecret,
  listSecrets,
  getSecret,
  deleteSecret
} = require('./controller')

router.post('/:project_id/create', createSecret)

router.get('/:project_id/list', listSecrets)

router.get('/:secret_id/show', getSecret)

router.delete('/:secret_id/delete', deleteSecret)

module.exports = router
