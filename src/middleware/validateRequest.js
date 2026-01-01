const { ZodError } = require('zod')

/**
 * Validation middleware factory for request validation using Zod schemas
 * @param {Object} schemas - Object containing validation schemas
 * @param {Object} schemas.body - Zod schema for request body
 * @param {Object} schemas.params - Zod schema for request params
 * @param {Object} schemas.query - Zod schema for request query
 * @returns {Function} Express middleware function
 */
function validateRequest(schemas = {}) {
  return (req, res, next) => {
    try {
      // Validate request body
      if (schemas.body) {
        req.body = schemas.body.parse(req.body)
      }

      // Validate request params
      if (schemas.params) {
        req.params = schemas.params.parse(req.params)
      }

      // Validate request query
      if (schemas.query) {
        req.query = schemas.query.parse(req.query)
      }

      next()
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues || []

        if (issues.length === 0) {
          return res.status(422).json({
            success: false,
            message: 'Validation failed',
            errors: []
          })
        }

        // Format errors for better readability
        const formattedErrors = issues.map((issue) => ({
          field: issue.path.join('.') || 'unknown',
          message: issue.message,
          code: issue.code
        }))

        return res.status(422).json({
          success: false,
          message: formattedErrors[0].message
        })
      }

      // Handle non-Zod errors
      return res.status(500).json({
        success: false,
        message: 'Internal validation error'
      })
    }
  }
}

module.exports = validateRequest
