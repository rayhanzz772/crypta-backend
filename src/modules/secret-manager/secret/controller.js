const cuid = require('cuid')
const api = require('../../../utils/api')
const { HttpStatusCode } = require('axios')
const HTTP_OK = HttpStatusCode?.Ok || 200

async function createSecret(req, res) {
  const { Project, Secret } = req.models
  const { project_id } = req.params
  const { name, labels = [] } = req.body
  const userId = req.user.userId

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

  const labelsObject = labels.reduce((acc, label) => {
    acc[label.key] = label.value
    return acc
  }, {})

  const activeSecretsCount = await Secret.count({
    where: { project_id, status: 'active' }
  })

  if (activeSecretsCount >= 5) {
    return res.status(400).json({
      message: 'Maximum limit of 5 active secrets reached for this project'
    })
  }

  const secret = await Secret.create({
    id: cuid(),
    project_id,
    name,
    labels: JSON.stringify(labelsObject),
    created_by: userId,
    status: 'active'
  })

  return res.status(201).json({
    success: true,
    data: {
      id: secret.id,
      project_id: secret.project_id,
      name: secret.name,
      labels: labelsObject,
      status: secret.status
    }
  })
}

async function listSecrets(req, res) {
  const { Secret } = req.models
  const { project_id } = req.params

  // Get pagination parameters from query string
  const page = parseInt(req.query.page) || 1
  const perPage = parseInt(req.query.per_page) || 10

  // Calculate offset for pagination
  const offset = (page - 1) * perPage

  const { count, rows } = await Secret.findAndCountAll({
    where: { project_id, status: 'active' },
    attributes: ['id', 'name', 'labels', 'status', 'created_at'],
    order: [['created_at', 'DESC']],
    limit: perPage,
    offset: offset
  })

  // Parse labels JSON for each secret
  const formattedItems = rows.map((item) => {
    const itemData = item.toJSON()
    return {
      ...itemData,
      labels:
        typeof itemData.labels === 'string'
          ? JSON.parse(itemData.labels)
          : itemData.labels || {}
    }
  })

  const results = {
    rows: formattedItems,
    count: count
  }

  return res.status(HTTP_OK).json(api.results(results, HTTP_OK, { req }))
}

async function getSecret(req, res) {
  const { Secret } = req.models
  const { secret_id } = req.params

  const secret = await Secret.findByPk(secret_id, {
    attributes: ['id', 'project_id', 'name', 'labels', 'status', 'created_at']
  })

  if (!secret) {
    return res.status(404).json({ success: false, message: 'Not found' })
  }

  const secretData = secret.toJSON()
  const formattedSecret = {
    ...secretData,
    labels:
      typeof secretData.labels === 'string'
        ? JSON.parse(secretData.labels)
        : secretData.labels || {}
  }

  return res
    .status(HTTP_OK)
    .json(api.results(formattedSecret, HTTP_OK, { req }))
}

async function deleteSecret(req, res) {
  const { Secret, SecretVersion } = req.models
  const { secret_id } = req.params

  const secret = await Secret.findByPk(secret_id)
  if (!secret) {
    return res.status(404).json({ success: false, message: 'Not found' })
  }

  await SecretVersion.update(
    { status: 'disabled' },
    {
      where: {
        secret_id: secret.id,
        status: 'enabled'
      }
    }
  )

  await secret.update({ status: 'disabled' })
  await secret.update({ deleted_at: new Date() })
  return res.status(HTTP_OK).json(api.results(null, HTTP_OK, { req }))
}

module.exports = { createSecret, listSecrets, getSecret, deleteSecret }
