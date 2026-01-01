const express = require('express')
const router = express.Router()

const { createProject } = require('./controller')
// const validate = require('../../middlewares/validate')
// const createProjectSchema = require('./validation/create-project.schema')

router.post('/', createProject)

module.exports = router
