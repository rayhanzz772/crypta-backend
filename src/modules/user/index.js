const Controller = require('./controller')
const router = require('express').Router()
const authentication = require("../../middleware/authMiddleware");

router.get('/', Controller.getUser)
router.post('/check-password', authentication, Controller.checkPassword)

module.exports = router