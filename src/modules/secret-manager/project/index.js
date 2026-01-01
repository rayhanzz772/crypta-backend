const express = require('express')
const router = express.Router()
const validateRequest = require('../../../middleware/validateRequest')
const { createProjectSchema } = require('./schema')
const { createProject } = require('./controller')

router.post('/', validateRequest({ body: createProjectSchema }), createProject)

module.exports = router
