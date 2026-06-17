const { api } = require('../../../src/utils/api')
const db = require('../../../db/models')
const { HttpStatusCode } = require('axios')
const bcrypt = require('bcrypt')
const { validateRequest } = require('../../../src/utils/validation')

const HTTP_OK = HttpStatusCode.Ok

class Controller {
  static async getUser(req, res) {
    try {
      // Restrict to self-lookup only — prevent user enumeration
      const userId = req.user.userId

      const user = await db.User.findOne({
        where: { id: userId, deleted_at: null },
        attributes: ['id', 'username', 'email', 'created_at', 'last_login_at']
      })

      if (!user) {
        return res.status(HttpStatusCode.NotFound).json(
          api(null, HttpStatusCode.NotFound, { message: 'User not found' })
        )
      }

      const result = {
        count: 1,
        rows: [user]
      }

      return res.status(HTTP_OK).json(api(result))
    } catch (err) {
      console.error(err)
      const code = err?.code ?? HttpStatusCode.InternalServerError
      return res.status(code).json(api(null, code, { err }))
    }
  }

  static async checkPassword(req, res) {
    try {
      const { master_password } = req.body
      const email = req.user.email

      const user = await db.User.findOne({ where: { email } })

      const isValid = await bcrypt.compare(master_password, user.master_hash)
      if (!isValid) {
        return res.status(HTTP_OK).json(api({ valid: false }))
      }

      return res.status(HTTP_OK).json(api({ valid: true }))
    } catch (err) {
      console.error(err)
      const code = err?.code ?? HttpStatusCode.InternalServerError
      return res.status(code).json(api(null, code, { err }))
    }
  }
}

module.exports = Controller
