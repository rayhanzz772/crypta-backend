const { z } = require('zod')

const ProjectSchema = z.object({
  name: z
    .string()
    .min(3, 'Project name terlalu pendek')
    .max(100, 'Project name terlalu panjang')
})

module.exports = {
  ProjectSchema
}
