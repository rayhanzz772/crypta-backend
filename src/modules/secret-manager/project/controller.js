const cuid = require('cuid')
const slugify = require('slugify')
const api = require('../../../utils/api')
const { HttpStatusCode } = require('axios')
const HTTP_OK = HttpStatusCode?.Ok || 200

async function createProject(req, res) {
  const { Project } = req.models
  const ownerId = req.user.userId
  const { name } = req.body

  const slug = slugify(name, {
    lower: true,
    strict: true
  })

  const exists = await Project.findOne({
    where: { slug }
  })

  if (exists) {
    return res.status(400).json({
      success: false,
      message: 'Projects with the same name already exists'
    })
  }

  const activeProjectsCount = await Project.count({
    where: { owner_id: ownerId }
  })

  if (activeProjectsCount >= 5) {
    return res.status(400).json({
      message: 'Maximum limit of 5 projects reached for this user'
    })
  }

  await Project.create({
    id: cuid(),
    name,
    slug,
    owner_id: ownerId,
    status: 'active'
  })

  return res.status(HTTP_OK).json(api.results(null, HTTP_OK, { req }))
}

async function getAllProjects(req, res) {
  const { Project } = req.models
  const ownerId = req.user.userId

  // Get pagination parameters from query string
  const page = parseInt(req.query.page) || 1
  const perPage = parseInt(req.query.per_page) || 10

  // Calculate offset for pagination
  const offset = (page - 1) * perPage

  const { count, rows } = await Project.findAndCountAll({
    where: { owner_id: ownerId },
    limit: perPage,
    offset: offset,
    order: [['created_at', 'DESC']]
  })

  const results = {
    rows: rows,
    count: count
  }

  return res.status(HTTP_OK).json(api.results(results, HTTP_OK, { req }))
}

async function getProjectById(req, res) {
  const { Project } = req.models
  const ownerId = req.user.userId
  const { id } = req.params

  const project = await Project.findOne({
    where: { id, owner_id: ownerId }
  })

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    })
  }

  return res.status(HTTP_OK).json(api.results(project, HTTP_OK, { req }))
}

async function deleteProject(req, res) {
  const { Project } = req.models
  const ownerId = req.user.userId
  const { id } = req.params

  const project = await Project.findOne({
    where: { id, owner_id: ownerId }
  })

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found'
    })
  }

  await project.destroy()

  return res.status(HTTP_OK).json(api.results(null, HTTP_OK, { req }))
}

module.exports = {
  createProject,
  deleteProject,
  getAllProjects,
  getProjectById
}
