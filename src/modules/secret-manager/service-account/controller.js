const crypto = require('crypto')
const cuid = require('cuid')
const slugify = require('slugify')
const api = require('../../../utils/api')
const HttpStatusCode = require('axios')
const HTTP_OK = HttpStatusCode?.Ok || 200

async function listServiceAccounts(req, res) {
  const { ServiceAccount } = req.models
  const { project_id } = req.params

  // Get pagination parameters from query string
  const page = parseInt(req.query.page) || 1
  const perPage = parseInt(req.query.per_page) || 10

  // Calculate offset for pagination
  const offset = (page - 1) * perPage

  const { count, rows } = await ServiceAccount.findAndCountAll({
    where: { project_id, status: 'active', deleted_at: null },
    attributes: ['id', 'client_id', 'status', 'created_at'],
    order: [['created_at', 'DESC']],
    limit: perPage,
    offset: offset
  })

  const results = {
    rows: rows,
    count: count
  }

  return res.status(HTTP_OK).json(api.results(results, HTTP_OK, { req }))
}

async function createServiceAccount(req, res) {
  const { Project, ServiceAccount } = req.models
  const { project_id } = req.params
  const { name } = req.body

  const project = await Project.findByPk(project_id)
  if (!project) {
    return res.status(404).json({ message: 'Project not found' })
  }

  const activeServiceAccountsCount = await ServiceAccount.count({
    where: { project_id, status: 'active' }
  })
  if (activeServiceAccountsCount >= 5) {
    return res.status(400).json({
      message: 'Maximum limit of 5 service accounts reached for this project'
    })
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

  return res.status(HTTP_OK).json(
    api.results(
      {
        id: sa.id,
        client_id: sa.client_id,
        created_at: sa.created_at,
        private_key: privateKey
      },
      HTTP_OK,
      { req }
    )
  )
}

async function deleteServiceAccount(req, res) {
  const { ServiceAccount, IamBinding } = req.models
  const { service_account_id } = req.params

  const sa = await ServiceAccount.findByPk(service_account_id)
  if (!sa) return res.status(404).json({ message: 'Not found' })

  const now = new Date()

  await sa.update({
    status: 'disabled',
    deleted_at: now
  })

  await IamBinding.update(
    {
      deleted_at: now
    },
    {
      where: {
        subject_type: 'service_account',
        subject_id: sa.id,
        deleted_at: null
      }
    }
  )

  return res.status(HTTP_OK).json(api.results(null, HTTP_OK, { req }))
}

module.exports = {
  createServiceAccount,
  listServiceAccounts,
  deleteServiceAccount
}
