const cuid = require('cuid')

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

  const secret = await Secret.create({
    id: cuid(),
    project_id,
    name,
    created_by: userId,
    status: 'active'
  })

  return res.status(201).json({
    success: true,
    data: {
      id: secret.id,
      project_id: secret.project_id,
      name: secret.name,
      status: secret.status
    }
  })
}

async function listSecrets(req, res) {
  const { Secret } = req.models
  const { project_id } = req.params

  const items = await Secret.findAll({
    where: { project_id },
    attributes: ['id', 'name', 'status', 'created_at'],
    order: [['created_at', 'DESC']]
  })

  res.json({ success: true, data: items })
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

  res.json({ success: true, data: secret })
}

async function deleteSecret(req, res) {
  const { Secret } = req.models
  const { secret_id } = req.params

  const secret = await Secret.findByPk(secret_id)
  if (!secret) {
    return res.status(404).json({ success: false, message: 'Not found' })
  }

  await secret.update({ status: 'disabled' })
  res.json({ success: true })
}

module.exports = { createSecret, listSecrets, getSecret, deleteSecret }
