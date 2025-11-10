const router = require('express').Router();
const authentication = require("../../middleware/authMiddleware");
const Controller = require('./controller');

router.post('/', Controller.createCategory);
router.get('/', Controller.getCategories);

module.exports = router;