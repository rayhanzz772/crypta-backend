const express = require('express')
const validateRequest = require('../../../middleware/validateRequest')
const { authTokenSchema } = require('./schema')
const { issueToken } = require('./controller')

const router = express.Router()

router.post('/token', validateRequest({ body: authTokenSchema }), issueToken)

module.exports = router
