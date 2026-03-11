const db = require('../../../db/models')
const { HttpStatusCode } = require('axios')
const api = require('../../utils/api')
const HTTP_OK = HttpStatusCode?.Ok || 200
const INTERNAL_SERVER_ERROR = HttpStatusCode?.InternalServerError || 500
const VaultLog = db.VaultLog

class Controller {
  static async getVaultLogs(req, res) {
    try {
      const userId = req.user.userId

      const logs = await db.sequelize.query(
        `
        SELECT 
          vl.id,
          vl.action,
          vl.created_at,
          COALESCE(vp.name, sn.title) AS log_name
        FROM vault_logs vl
        LEFT JOIN vault_passwords vp ON vl.vault_id = vp.id
        LEFT JOIN secret_notes sn ON vl.note_id = sn.id
        WHERE vl.user_id = :userId
        ORDER BY vl.created_at DESC
        LIMIT 5
      `,
        {
          replacements: { userId },
          type: db.sequelize.QueryTypes.SELECT
        }
      )

      return res.status(HTTP_OK).json(api.results(logs, HTTP_OK, { req }))
    } catch (err) {
      const code = err.code ?? INTERNAL_SERVER_ERROR
      return res.status(code).json(api.results(null, code, { err }))
    }
  }

  static async logAction(req, res) {
    const t = await db.sequelize.transaction()
    try {
      const userId = req.user.userId
      const { vaultId, action } = req.body

      await VaultLog.create(
        {
          user_id: userId,
          vault_id: vaultId,
          action: action
        },
        { transaction: t }
      )

      await t.commit()
      res.status(HTTP_OK).json(api.results(null, HTTP_OK, { req }))
    } catch (err) {
      await t.rollback()
      console.error('Log action error:', err)
    }
  }

  static async logRecentActivity(req, res) {
    try {
      const userId = req.user.userId

      const result = await db.sequelize.query(
        `
      SELECT action, COUNT(*) AS total
      FROM vault_logs
      WHERE user_id = :userId
      GROUP BY action
      `,
        {
          replacements: { userId },
          type: db.Sequelize.QueryTypes.SELECT
        }
      )

      const summary = result.reduce((acc, row) => {
        acc[row.action] = parseInt(row.total, 10)
        return acc
      }, {})

      res.status(HTTP_OK).json(api.results(summary, HTTP_OK, { req }))
    } catch (err) {
      console.error('Log action error:', err)
      res.status(500).json({ success: false, message: err.message })
    }
  }
}

module.exports = Controller
