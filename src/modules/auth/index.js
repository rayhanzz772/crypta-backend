const Controller = require('./controller')
const router = require('express').Router()

router.post('/login', Controller.login)
router.post('/logout', Controller.logout)
router.post("/register", Controller.register);

module.exports = router;
