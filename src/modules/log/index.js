const express = require('express')
const router = require('express').Router()
const Controller = require('./controller')
const validateRequest = require('../../middleware/validateRequest')
const { logActionSchema } = require('./schema')

router.get('/logs', Controller.getVaultLogs)
router.post(
  '/logs',
  validateRequest({ body: logActionSchema }),
  Controller.logAction
)
router.get('/recent-activity', Controller.logRecentActivity)

module.exports = router
