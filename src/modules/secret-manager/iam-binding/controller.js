const cuid = require('cuid')
const api = require('../../../utils/api')
const HttpStatusCode = require('axios')
const HTTP_OK = HttpStatusCode?.Ok || 200

async function createBinding(req, res) {
  const { IamBinding, ServiceAccount, Secret } = req.models
  const { secret_id } = req.params
  const { service_account_id } = req.body

  const secret = await Secret.findByPk(secret_id)
  if (!secret || secret.status !== 'active') {
    return res.status(404).json({
      success: false,
      message: 'Secret not found or disabled'
    })
  }

  const sa = await ServiceAccount.findByPk(service_account_id)
  if (!sa || sa.status !== 'active') {
    return res.status(400).json({
      success: false,
      message: 'Invalid service account'
    })
  }

  if (sa.project_id !== secret.project_id) {
    return res.status(403).json({
      success: false,
      message: 'Cross-project binding is not allowed'
    })
  }

  const exists = await IamBinding.findOne({
    where: {
      subject_type: 'service_account',
      subject_id: service_account_id,
      resource_type: 'secret',
      resource_id: secret_id,
      role: 'secret.accessor'
    }
  })

  if (exists) {
    return res.status(409).json({
      success: false,
      message: 'Service account already has access to this secret'
    })
  }

  await IamBinding.create({
    id: cuid(),
    subject_type: 'service_account',
    subject_id: service_account_id,
    resource_type: 'secret',
    resource_id: secret_id,
    role: 'secret.accessor'
  })

  return res.status(HTTP_OK).json(api.results(null, HTTP_OK, { req }))
}

async function listBindings(req, res) {
  const { IamBinding } = req.models
  const { subject_id, resource_id } = req.query

  const where = {
    deleted_at: null
  }

  if (subject_id) where.subject_id = subject_id
  if (resource_id) where.resource_id = resource_id

  const items = await IamBinding.findAll({
    where,
    order: [['created_at', 'DESC']]
  })

  return res.status(HTTP_OK).json(api.results(items, HTTP_OK, { req }))
}

async function deleteBinding(req, res) {
  const { IamBinding } = req.models
  const { binding_id } = req.params

  const binding = await IamBinding.findByPk(binding_id)
  if (!binding) {
    return res.status(404).json({ success: false, message: 'Not found' })
  }

  await binding.destroy()
  return res.status(HTTP_OK).json(api.results(null, HTTP_OK, { req }))
}

module.exports = { createBinding, listBindings, deleteBinding }
