const cuid = require('cuid')
const api = require('../../../utils/api')
const { HttpStatusCode } = require('axios')
const HTTP_OK = HttpStatusCode?.Ok || 200

async function createSecret(req, res) {
  const { Project, Secret } = req.models
  const { project_id } = req.params
  const { name } = req.body
  const userId = req.userId

  const project = await Project.findByPk(project_id)
  if (!project) {
    return res
      .status(404)
      .json({ success: false, message: 'Project not found' })
  }

  const exists = await Secret.findOne({
    where: { project_id, name }
  })
  if (exists) {
    return res
      .status(400)
      .json({ success: false, message: 'Secret already exists' })
  }

  await Secret.create({
    id: cuid(),
    project_id,
    name,
    created_by: userId,
    status: 'active'
  })

  return res.status(HTTP_OK).json(api.results(null, HTTP_OK, { req }))
}

async function listSecrets(req, res) {
  const { Secret } = req.models
  const { project_id } = req.params

  const items = await Secret.findAll({
    where: { project_id },
    attributes: ['id', 'name', 'status', 'created_at'],
    order: [['created_at', 'DESC']]
  })

  return res.status(HTTP_OK).json(api.results(items, HTTP_OK, { req, items }))
}

async function getSecret(req, res) {
  const { Secret } = req.models
  const { secret_id } = req.params

  const secret = await Secret.findByPk(secret_id, {
    attributes: ['id', 'project_id', 'name', 'status', 'created_at']
  })

  if (!secret) {
    return res.status(404).json({ success: false, message: 'Not found' })
  }

  return res.status(HTTP_OK).json(api.results(secret, HTTP_OK, { req }))
}

async function deleteSecret(req, res) {
  const { Secret } = req.models
  const { secret_id } = req.params

  const secret = await Secret.findByPk(secret_id)
  if (!secret) {
    return res.status(404).json({ success: false, message: 'Not found' })
  }

  await secret.update({ status: 'disabled' })
  return res.status(HTTP_OK).json(api.results(null, HTTP_OK, { req }))
}

module.exports = { createSecret, listSecrets, getSecret, deleteSecret }
