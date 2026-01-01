const crypto = require('crypto')
const cuid = require('cuid')
const slugify = require('slugify')
const api = require('../../../utils/api')

async function listServiceAccounts(req, res) {
  const { ServiceAccount } = req.models
  const { project_id } = req.params

  const items = await ServiceAccount.findAll({
    where: { project_id },
    attributes: ['id', 'client_id', 'status', 'created_at'],
    order: [['created_at', 'DESC']]
  })

  return res.status(HTTP_OK).json(api.results(items, HTTP_OK, { req }))
}

async function createServiceAccount(req, res) {
  const { Project, ServiceAccount } = req.models
  const { project_id } = req.params
  const { name } = req.body

  const project = await Project.findByPk(project_id)
  if (!project) {
    return res.status(404).json({ message: 'Project not found' })
  }

  const normalizedName = slugify(name, { lower: true, strict: true })
  const projectSlug = project.slug

  const clientId = `${normalizedName}@${projectSlug}.crypta`

  const exists = await ServiceAccount.findOne({
    where: { project_id, client_id: clientId }
  })
  if (exists) {
    return res.status(400).json({
      message: 'Service account already exists'
    })
  }

  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  })

  const sa = await ServiceAccount.create({
    id: cuid(),
    name: name,
    project_id,
    client_id: clientId,
    public_key: publicKey,
    status: 'active'
  })

  return res.status(HTTP_OK).json(api.results(null, HTTP_OK, { req }))
}

async function deleteServiceAccount(req, res) {
  const { ServiceAccount } = req.models
  const { service_account_id } = req.params

  const sa = await ServiceAccount.findByPk(service_account_id)
  if (!sa) return res.status(404).json({ message: 'Not found' })

  await sa.update({ status: 'disabled' })

  return res.status(HTTP_OK).json(api.results(null, HTTP_OK, { req }))
}

module.exports = {
  createServiceAccount,
  listServiceAccounts,
  deleteServiceAccount
}
