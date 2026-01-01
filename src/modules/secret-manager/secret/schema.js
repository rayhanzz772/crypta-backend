const { z } = require('zod')

module.exports = z.object({
  name: z
    .string()
    .min(3)
    .max(60)
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      'Gunakan UPPERCASE, angka, underscore (contoh: DB_PASSWORD)'
    )
})
