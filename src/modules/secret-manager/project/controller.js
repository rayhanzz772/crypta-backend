const cuid = require('cuid')
const slugify = require('slugify')
const api = require('../../../utils/api')
const { HttpStatusCode } = require('axios')
const HTTP_OK = HttpStatusCode?.Ok || 200

async function createProject(req, res) {
  const { Project } = req.models
  const ownerId = req.userId
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
      message: 'Project dengan nama serupa sudah ada'
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

module.exports = {
  createProject
}
