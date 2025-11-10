const Controller = require('./controller')
const router = require('express').Router()

router.get('/', Controller.getUser)
router.post('/check-password', Controller.checkPassword)

module.exports = router