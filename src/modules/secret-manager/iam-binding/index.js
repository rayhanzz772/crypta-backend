const express = require('express')
const router = express.Router()

const { createBinding, listBindings, deleteBinding } = require('./controller')

router.post('/:secret_id/create', createBinding)

router.get('/', listBindings)

router.delete('/:binding_id/delete', deleteBinding)

module.exports = router
