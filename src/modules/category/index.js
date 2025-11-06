const router = require('express').Router();
const authentication = require("../../middleware/authMiddleware");
const Controller = require('./controller');

router.post('/', authentication, Controller.createCategory);
router.get('/', authentication, Controller.getCategories);

module.exports = router;