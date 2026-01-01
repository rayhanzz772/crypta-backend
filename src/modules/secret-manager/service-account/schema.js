const { z } = require('zod')

module.exports = z.object({
  name: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'gunakan huruf kecil, angka, dash')
})
