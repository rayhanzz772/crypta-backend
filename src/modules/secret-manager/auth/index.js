const express = require('express')
const { issueToken } = require('./controller')

const router = express.Router()

router.post('/token', issueToken)

module.exports = router
