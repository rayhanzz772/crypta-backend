const cuid = require('cuid')
const slugify = require('slugify')

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

  const project = await Project.create({
    id: cuid(),
    name,
    slug,
    owner_id: ownerId,
    status: 'active'
  })

  return res.status(201).json({
    success: true,
    data: {
      id: project.id,
      name: project.name,
      slug: project.slug,
      status: project.status
    }
  })
}

module.exports = {
  createProject
}
