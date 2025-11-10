const router = require('express').Router();
const Controller = require('./controller');

router.post('/generate-key', Controller.GenerateKey);
router.get('/api-keys', Controller.GetApiKeys);
router.post('/revoke-key/:id', Controller.RevokeApiKey);

module.exports = router;