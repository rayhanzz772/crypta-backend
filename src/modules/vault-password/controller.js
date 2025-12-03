const db = require('../../../db/models')
const { HttpStatusCode } = require('axios')
const VaultPassword = db.VaultPassword
const VaultLog = db.VaultLog
const api = require('../../utils/api')
const HTTP_OK = HttpStatusCode?.Ok || 200
const INTERNAL_SERVER_ERROR = HttpStatusCode?.InternalServerError || 500
const NOT_FOUND = HttpStatusCode?.NotFound || 404
const BAD_REQUEST = HttpStatusCode?.BadRequest || 400
const { encrypt, decrypt } = require('../../utils/encryption')

class Controller {
  static async createVaultPassword(req, res) {
    const t = await db.sequelize.transaction()
    try {
      const { name, username, password, note, master_password, category_id } =
        req.body
      const userId = req.user.userId

      if (!master_password) {
        return res
          .status(400)
          .json({
            success: false,
            message: 'Master password required for encryption'
          })
      }

      const kdfType = 'argon2id'
      const kdfParams = {
        memoryCost: 2 ** 16,
        timeCost: 3,
        parallelism: 1
      }

      const encrypted = await encrypt(password, master_password, kdfParams)

      const item = await VaultPassword.create(
        {
          user_id: userId,
          name,
          username,
          password_encrypted: JSON.stringify(encrypted),
          category_id: category_id || null,
          note,
          kdf_type: kdfType,
          kdf_params: kdfParams
        },
        { transaction: t }
      )

      if (!item) {
        throw new Error('Failed to create vault item')
      }

      if (item && item.id) {
        await VaultLog.create(
          {
            user_id: userId,
            vault_id: item.id,
            action: 'Create new password'
          },
          { transaction: t }
        )
      }

      await t.commit()

      return res.status(HTTP_OK).json(api.results(null, HTTP_OK, { req }))
    } catch (err) {
      await t.rollback()
      console.error('Create vault error:', err)
      res.status(500).json({ success: false, message: err.message })
    }
  }

  static async getVaultPasswords(req, res) {
    try {
      const userId = req.user.userId

      const limit = parseInt(req.query.per_page?.trim()) || 10
      const page = parseInt(req.query.page?.trim()) || 1
      const offset = (page - 1) * limit

      const replacements = { userId, limit, offset }

      const category = req.query.category ? req.query.category?.trim() : null

      const q = req.query.q ? req.query.q?.trim() : null
      const where = ['vp.user_id = :userId AND vp.deleted_at IS NULL']

      if (q) {
        where.push('(vp.name ILIKE :search OR vp.note ILIKE :search)')
        replacements.search = `%${q}%`
      }

      if (category) {
        where.push('c.name = :category')
        replacements.category = category
      }

      const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''
      const items = await db.sequelize.query(
        `
        SELECT 
          vp.id, 
          vp.name, 
          vp.username, 
          vp.note, 
          TO_CHAR(vp.created_at, 'YYYY/MM/DD') AS created_at,
          TO_CHAR(vp.updated_at, 'YYYY/MM/DD') AS updated_at,
          c.name AS category_name,
          CASE WHEN f.id IS NOT NULL THEN true ELSE false END AS is_favorite
        FROM vault_passwords vp
        LEFT JOIN categories c ON vp.category_id = c.id
        LEFT JOIN favorites f 
          ON f.target_id = vp.id
          AND f.type = 'password'
          AND f.user_id = :userId
        ${whereClause}
        ORDER BY 
          is_favorite DESC,
          vp.created_at DESC
        LIMIT :limit OFFSET :offset
        `,
        {
          replacements,
          type: db.sequelize.QueryTypes.SELECT,
          logging: console.log
        }
      )

      const totalCount = await db.sequelize.query(
        `
        SELECT COUNT(*) as total
        FROM vault_passwords vp
        LEFT JOIN categories c ON vp.category_id = c.id
        ${whereClause}
      `,
        {
          replacements,
          type: db.sequelize.QueryTypes.SELECT
        }
      )

      const results = {
        rows: items,
        count: parseInt(totalCount[0]?.total) || 0
      }

      return res.status(HTTP_OK).json(api.results(results, HTTP_OK, { req }))
    } catch (err) {
      const code = err.code ?? INTERNAL_SERVER_ERROR
      return res.status(code).json(api.results(null, code, { err }))
    }
  }

  static async decryptVaultPassword(req, res) {
    try {
      const { id } = req.params
      const { master_password } = req.body
      const userId = req.user.userId

      const item = await db.sequelize
        .query(
          `
        SELECT
          vp.*,
          categories.name AS category_name
        FROM vault_passwords as vp
        LEFT JOIN categories ON vp.category_id = categories.id
        WHERE vp.id = :id AND vp.user_id = :userId
        AND vp.deleted_at IS NULL
      `,
          {
            replacements: { id, userId },
            type: db.sequelize.QueryTypes.SELECT
          }
        )
        .then((results) => results[0])

      if (!item) {
        return res
          .status(404)
          .json({ success: false, message: 'Vault item not found' })
      }

      const { kdf_type, kdf_params } = item

      if (kdf_type !== 'argon2id') {
        return res.status(400).json({
          success: false,
          message: `Unsupported KDF type: ${kdf_type}`
        })
      }

      let encryptedObj
      try {
        encryptedObj = JSON.parse(item.password_encrypted)
      } catch {
        throw new Error('Invalid encrypted data format')
      }

      const decrypted = await decrypt(encryptedObj, master_password, kdf_params)

      await VaultLog.create({
        user_id: userId,
        vault_id: item.id,
        action: 'Decrypted password',
        timestamp: new Date()
      })

      const items = {
        id: item.id,
        category: item.category_name,
        name: item.name,
        username: item.username,
        password: decrypted,
        updated_at: item.updated_at,
        note: item.note
      }

      return res.status(HTTP_OK).json(api.results(items, HTTP_OK, { req }))
    } catch (err) {
      console.error('Decrypt error:', err)
      res.status(500).json({ success: false, message: err.message })
    }
  }

  static async updateVaultPassword(req, res) {
    const t = await db.sequelize.transaction()
    try {
      const { id } = req.params
      const { name, username, password, note, master_password, category } =
        req.body
      const userId = req.user.userId

      const item = await VaultPassword.findOne({
        where: { id, user_id: userId }
      })
      if (!item) throw new Error('Vault item not found')

      if (password && !master_password) {
        throw new Error('Master password required for encryption')
      }

      let encryptedPassword
      if (password) {
        const kdfParams = item.kdf_params || {
          memoryCost: 2 ** 16,
          timeCost: 3,
          parallelism: 1
        }
        const encryptionResult = await encrypt(
          password,
          master_password,
          kdfParams
        )
        encryptedPassword = JSON.stringify(encryptionResult)
      }

      let categoryRecord = null
      if (category) {
        categoryRecord = await db.Category.findOne({
          where: { name: category }
        })
        if (!categoryRecord) throw new Error(`Category '${category}' not found`)
      }

      await item.update(
        {
          name: name ?? item.name,
          username: username ?? item.username,
          password_encrypted: encryptedPassword ?? item.password_encrypted,
          category_id: categoryRecord ? categoryRecord.id : item.category_id,
          note: note ?? item.note
        },
        { transaction: t }
      )

      await VaultLog.create(
        {
          user_id: userId,
          vault_id: item.id,
          action: 'Updated password'
        },
        { transaction: t }
      )

      await t.commit()
      return res.status(HTTP_OK).json(api.results(null, HTTP_OK, { req }))
    } catch (err) {
      await t.rollback()
      console.error('Update vault error:', err)
      res.status(500).json({ success: false, message: err.message })
    }
  }

  static async deleteVaultPassword(req, res) {
    const t = await db.sequelize.transaction()
    try {
      const { id } = req.params
      const userId = req.user.userId

      const item = await VaultPassword.findOne({
        where: { id, user_id: userId }
      })
      if (!item) {
        throw new Error('Vault item not found')
      }

      await item.destroy()

      if (item && item.id) {
        await VaultLog.create({
          user_id: userId,
          vault_id: item.id,
          action: 'Deleted password'
        })
      }
      await t.commit()
      return res.status(HTTP_OK).json(api.results(null, HTTP_OK, { req }))
    } catch (err) {
      await t.rollback()
      console.error('Create vault error:', err)
      res.status(500).json({ success: false, message: err.message })
    }
  }

  static async getVaultLogs(req, res) {
    try {
      const userId = req.user.userId

      const logs = await db.sequelize.query(
        `
        SELECT 
          vl.id,
          vl.action,
          vl.created_at,
          vp.name AS vault_name
        FROM vault_logs vl
        LEFT JOIN vault_passwords vp ON vl.vault_id = vp.id
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

  static async toggleFavorite(req, res) {
    const t = await db.sequelize.transaction()
    try {
      const userId = req.user.userId
      const { target_id, type } = req.body

      const existing = await db.Favorite.findOne({
        where: { user_id: userId, target_id, type }
      })

      if (existing) {
        await existing.destroy({ transaction: t })
        await t.commit()
        return res
          .status(HTTP_OK)
          .json(api.results({ favorited: false }, HTTP_OK, { req }))
      }

      const MAX_FAVORITES = 3
      const totalFavorites = await db.Favorite.count({
        where: { user_id: userId, type }
      })

      if (totalFavorites >= MAX_FAVORITES) {
        throw new Error(
          `You can only have ${MAX_FAVORITES} favorites for ${type}s`
        )
      }

      await db.Favorite.create(
        {
          user_id: userId,
          target_id,
          type
        },
        { transaction: t }
      )

      await t.commit()
      return res
        .status(HTTP_OK)
        .json(api.results({ favorited: true }, HTTP_OK, { req }))
    } catch (err) {
      await t.rollback()
      console.error('Toggle favorite secret note error:', err)
      res
        .status(INTERNAL_SERVER_ERROR)
        .json({ success: false, message: err.message })
    }
  }
}

module.exports = Controller
