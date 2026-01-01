const { z } = require('zod')

// Validation for auth token request
const authTokenSchema = z.object({
  assertion: z
    .string({ required_error: 'JWT assertion is required' })
    .min(1, 'Assertion cannot be empty')
    .regex(
      /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
      'Invalid JWT format'
    )
})

module.exports = {
  authTokenSchema
}
