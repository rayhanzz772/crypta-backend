const { z } = require('zod')

module.exports = z.object({
  subject_type: z.literal('service_account'),
  subject_id: z.string().min(1),
  resource_type: z.literal('secret'),
  resource_id: z.string().min(1),
  role: z.literal('secret.accessor')
})
