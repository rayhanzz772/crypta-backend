const express = require('express')
const router = express.Router()

const { createSecretVersion, listSecretVersions } = require('./controller')

router.post('/:secret_id/create', createSecretVersion)
router.get('/:secret_id/list', listSecretVersions)

module.exports = router
