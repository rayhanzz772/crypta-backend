const db = require('../../../db/models')
const { HttpStatusCode } = require('axios')
const VaultPassword = db.VaultPassword
const VaultLog = db.VaultLog
const api = require('../../utils/api')
const HTTP_OK = HttpStatusCode?.Ok || 200
const INTERNAL_SERVER_ERROR = HttpStatusCode?.InternalServerError || 500
const NOT_FOUND = HttpStatusCode?.NotFound || 404
const BAD_REQUEST = HttpStatusCode?.BadRequest || 400



/**
 * Helper: Get user's mek_version to decide encryption path
 */
async function getUserMekVersion(userId) {
  const user = await db.User.findByPk(userId, {
    attributes: ['mek_version']
  })
  return user ? user.mek_version : 0
}

/**
 * Helper: Parse MEK from request body (hex string → Buffer)
 */
function parseMEK(mekHex) {
  if (!mekHex || typeof mekHex !== 'string') return null
  const buf = Buffer.from(mekHex, 'hex')
  if (buf.length !== 32) return null
  return buf
}

class Controller {
  static async createVaultPassword(req, res) {
    const t = await db.sequelize.transaction()
    try {
      const {
        name,
        username,
        password_encrypted,
        note,
        category_id
      } = req.body
      const userId = req.user.userId

      const item = await VaultPassword.create(
        {
          user_id: userId,
          name,
          username: username || null,
          password_encrypted,
          category_id: category_id || null,
          note,
          kdf_type: 'mek',
          kdf_params: null
        },
        { transaction: t }
      )

      if (!item) {
        throw new Error('Failed to create vault item')
      }

      await VaultLog.create(
        {
          user_id: userId,
          vault_id: item.id,
          action: 'Create new password'
        },
        { transaction: t }
      )

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
          vp.password_encrypted,
          vp.note, 
          vp.kdf_type,
          vp.kdf_params,
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
          type: db.sequelize.QueryTypes.SELECT
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

  // decryptVaultPassword removed for pure ZKE

  static async updateVaultPassword(req, res) {
    const t = await db.sequelize.transaction()
    try {
      const { id } = req.params
      const {
        name,
        username,
        password_encrypted,
        note,
        category
      } = req.body
      const userId = req.user.userId

      const item = await VaultPassword.findOne({
        where: { id, user_id: userId },
        transaction: t
      })
      if (!item) {
        await t.rollback()
        throw new Error('Vault item not found')
      }

      if (password_encrypted) {
        await db.sequelize.query(
          `UPDATE vault_passwords 
           SET password_encrypted = :password_encrypted,
               kdf_type = :kdf_type,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = :id AND user_id = :userId`,
          {
            replacements: {
              password_encrypted,
              kdf_type: 'mek',
              id,
              userId
            },
            type: db.sequelize.QueryTypes.UPDATE,
            transaction: t
          }
        )
      }

      let categoryRecord = null
      if (category) {
        categoryRecord = await db.Category.findOne({
          where: { name: category }
        })
        if (!categoryRecord) {
          await t.rollback()
          throw new Error(`Category '${category}' not found`)
        }
      }

      const updateData = {}
      if (name !== undefined) updateData.name = name
      if (username !== undefined) updateData.username = username
      if (note !== undefined) updateData.note = note
      if (categoryRecord) updateData.category_id = categoryRecord.id

      if (Object.keys(updateData).length > 0) {
        await item.update(updateData, { transaction: t })
      }

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

      await db.sequelize.query(
        `
        DELETE FROM favorites
        WHERE target_id = :id AND type = 'password' AND user_id = :userId
        `,
        {
          replacements: { id, userId },
          type: db.Sequelize.QueryTypes.DELETE
        }
      )

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

  static async toggleFavorite(req, res) {
    const t = await db.sequelize.transaction()
    try {
      const userId = req.user.userId
      const { target_id, type } = req.body

      // Verify that the target resource belongs to the requesting user
      if (type === 'password') {
        const target = await db.VaultPassword.findOne({
          where: { id: target_id, user_id: userId }
        })
        if (!target) {
          await t.rollback()
          return res.status(NOT_FOUND).json({
            success: false,
            message: 'Target password not found or does not belong to you'
          })
        }
      } else if (type === 'note') {
        const target = await db.SecretNote.findOne({
          where: { id: target_id, user_id: userId, deleted_at: null }
        })
        if (!target) {
          await t.rollback()
          return res.status(NOT_FOUND).json({
            success: false,
            message: 'Target note not found or does not belong to you'
          })
        }
      }

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
  // exportVaultCSV removed for pure ZKE
}

module.exports = Controller
