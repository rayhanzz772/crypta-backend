const db = require('../../../db/models')
const { HttpStatusCode } = require('axios')
const SecretNote = db.SecretNote
const api = require('../../utils/api')
const HTTP_OK = HttpStatusCode?.Ok || 200
const INTERNAL_SERVER_ERROR = HttpStatusCode?.InternalServerError || 500
const NOT_FOUND = HttpStatusCode?.NotFound || 404
const BAD_REQUEST = HttpStatusCode?.BadRequest || 400
const { encrypt, decrypt } = require('../../utils/encryption')

class Controller {
  static async createSecretNote(req, res) {
    const t = await db.sequelize.transaction()
    try {
      const { title, note, master_password, category_id, tags = [] } = req.body
      const userId = req.user.userId

      if (!master_password) {
        return res.status(400).json({
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

      const encrypted = await encrypt(note, master_password, kdfParams)

      const item = await SecretNote.create(
        {
          user_id: userId,
          title,
          note: JSON.stringify(encrypted),
          category_id: category_id || null,
          kdf_type: kdfType,
          kdf_params: kdfParams
        },
        { transaction: t }
      )

      if (tags.length > 0) {
        const tagRecords = []

        for (const tagName of tags) {
          const [tag] = await db.Tag.findOrCreate({
            where: { name: tagName.trim() },
            defaults: { name: tagName.trim() },
            transaction: t
          })
          tagRecords.push(tag)
        }
        await item.addTags(tagRecords, { transaction: t })
      }

      if (!item) {
        throw new Error('Failed to create secret note')
      }

      await t.commit()

      return res.status(HTTP_OK).json(api.results(null, HTTP_OK, { req }))
    } catch (err) {
      await t.rollback()
      console.error('Create secret note error:', err)
      res.status(500).json({ success: false, message: err.message })
    }
  }

  static async getSecretNotes(req, res) {
    try {
      const userId = req.user.userId

      const limit = parseInt(req.query.per_page?.trim()) || 10
      const page = parseInt(req.query.page?.trim()) || 1
      const offset = (page - 1) * limit

      const replacements = { userId, limit, offset }

      const category = req.query.category ? req.query.category?.trim() : null

      const q = req.query.q ? req.query.q?.trim() : null
      const where = ['sn.user_id = :userId AND sn.deleted_at IS NULL']

      if (q) {
        where.push('(sn.title ILIKE :search OR sn.note ILIKE :search)')
        replacements.search = `%${q}%`
      }

      if (category) {
        where.push('c.name = :category')
        replacements.category = category
      }

      const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

      const notes = await db.sequelize.query(
        `
        SELECT 
          sn.id, 
          sn.title, 
          c.name AS category_name, 
          sn.created_at, 
          sn.updated_at,
          COALESCE(
            JSON_AGG(t.name) FILTER (WHERE t.name IS NOT NULL),
            '[]'
          ) AS tags,
          CASE WHEN f.id IS NOT NULL THEN true ELSE false END AS is_favorite
        FROM secret_notes sn
        LEFT JOIN favorites f 
          ON f.target_id = sn.id
          AND f.type = 'note'
          AND f.user_id = :userId
        LEFT JOIN note_tags snt ON sn.id = snt.note_id
        LEFT JOIN tags t ON snt.tag_id = t.id
        LEFT JOIN categories c ON sn.category_id = c.id
        ${whereClause}
        GROUP BY sn.id, c.name, f.id
        ORDER BY 
                is_favorite DESC, 
                sn.created_at DESC
        LIMIT :limit OFFSET :offset
        `,
        {
          replacements,
          type: db.Sequelize.QueryTypes.SELECT
        }
      )

      const totalCountResult = await db.sequelize.query(
        `
        SELECT COUNT(*) AS count
        FROM secret_notes sn
        LEFT JOIN categories c ON sn.category_id = c.id
        ${whereClause}
        `,
        {
          replacements,
          type: db.Sequelize.QueryTypes.SELECT
        }
      )

      const results = {
        rows: notes,
        count: parseInt(totalCountResult[0]?.count) || 0
      }

      return res.status(HTTP_OK).json(api.results(results, HTTP_OK, { req }))
    } catch (err) {
      console.error('Get secret notes error:', err)
      res
        .status(INTERNAL_SERVER_ERROR)
        .json({ success: false, message: err.message })
    }
  }

  static async decryptSecretNote(req, res) {
    try {
      const { id } = req.params
      const { master_password } = req.body
      const userId = req.user.userId

      if (!master_password) {
        return res.status(BAD_REQUEST).json({
          success: false,
          message: 'Master password is required for decryption'
        })
      }

      const notes = await db.sequelize.query(
        `
        SELECT 
          sn.*,
          COALESCE(
            JSON_AGG(t.name) FILTER (WHERE t.name IS NOT NULL),
            '[]'
          ) AS tags
        FROM secret_notes sn
        LEFT JOIN note_tags snt ON sn.id = snt.note_id
        LEFT JOIN tags t ON snt.tag_id = t.id
        LEFT JOIN categories c ON sn.category_id = c.id
        WHERE sn.id = :id AND sn.user_id = :userId AND sn.deleted_at IS NULL
        GROUP BY sn.id
        ORDER BY sn.created_at DESC
        `,
        {
          replacements: { id, userId },
          type: db.Sequelize.QueryTypes.SELECT
        }
      )

      if (!notes || notes.length === 0) {
        return res
          .status(NOT_FOUND)
          .json({ success: false, message: 'Secret note not found' })
      }

      const { kdf_type, kdf_params } = notes[0]

      if (kdf_type !== 'argon2id') {
        return res.status(400).json({
          success: false,
          message: `Unsupported KDF type: ${kdf_type}`
        })
      }

      let encryptedObj
      try {
        encryptedObj = JSON.parse(notes[0].note)
      } catch {
        throw new Error('Invalid encrypted data format')
      }

      const decrypted = await decrypt(encryptedObj, master_password, kdf_params)

      const items = {
        id: notes[0].id,
        title: notes[0].title,
        tags: notes[0].tags,
        note: decrypted
      }

      return res.status(HTTP_OK).json(api.results(items, HTTP_OK, { req }))
    } catch (err) {
      console.error('Decrypt secret note error:', err)
      res
        .status(INTERNAL_SERVER_ERROR)
        .json({ success: false, message: err.message })
    }
  }

  static async deleteSecretNote(req, res) {
    try {
      const { id } = req.params
      const userId = req.user.userId

      const result = await db.sequelize.query(
        `
        UPDATE secret_notes
        SET deleted_at = NOW()
        WHERE id = :id AND user_id = :userId AND deleted_at IS NULL
        `,
        {
          replacements: { id, userId },
          type: db.Sequelize.QueryTypes.UPDATE
        }
      )

      if (result[0] === 0) {
        return res.status(NOT_FOUND).json({
          success: false,
          message: 'Secret note not found or already deleted'
        })
      }

      return res
        .status(HTTP_OK)
        .json({ success: true, message: 'Secret note deleted successfully' })
    } catch (err) {
      console.error('Delete secret note error:', err)
      res
        .status(INTERNAL_SERVER_ERROR)
        .json({ success: false, message: err.message })
    }
  }

  static async updateSecretNote(req, res) {
    const t = await db.sequelize.transaction()
    try {
      const { id } = req.params
      const { title, note, master_password, category_id, tags = [] } = req.body
      const userId = req.user.userId

      // First, fetch the item to verify it exists and get KDF params
      const item = await SecretNote.findOne({
        where: { id, user_id: userId, deleted_at: null },
        transaction: t
      })

      if (!item) {
        await t.rollback()
        return res
          .status(NOT_FOUND)
          .json({ success: false, message: 'Secret note not found' })
      }

      const updateData = {}

      if (title) updateData.title = title
      if (category_id !== undefined) updateData.category_id = category_id

      if (note) {
        if (!master_password) {
          await t.rollback()
          return res.status(BAD_REQUEST).json({
            success: false,
            message: 'Master password required for encryption'
          })
        }

        const kdfParams = item.kdf_params || {
          memoryCost: 2 ** 16,
          timeCost: 3,
          parallelism: 1
        }

        const encryptionResult = await encrypt(note, master_password, kdfParams)
        const encryptedJson = JSON.stringify(encryptionResult)

        // ✅ FIX: Use raw query to avoid PostgreSQL JSONB/TEXT type conversion issues
        await db.sequelize.query(
          `UPDATE secret_notes 
           SET note = :note, updated_at = CURRENT_TIMESTAMP
           WHERE id = :id AND user_id = :userId AND deleted_at IS NULL`,
          {
            replacements: {
              note: encryptedJson,
              id,
              userId
            },
            type: db.sequelize.QueryTypes.UPDATE,
            transaction: t
          }
        )

        console.log('✅ Note encrypted and updated successfully (raw query)')
      }

      // Update other fields using Sequelize ORM
      if (title || category_id !== undefined) {
        await item.update(updateData, { transaction: t })
      }

      if (tags.length > 0) {
        const tagRecords = []

        for (const tagName of tags) {
          const [tag] = await db.Tag.findOrCreate({
            where: { name: tagName.trim() },
            defaults: { name: tagName.trim() },
            transaction: t
          })
          tagRecords.push(tag)
        }
        await item.setTags(tagRecords, { transaction: t })
      }

      await t.commit()

      return res.status(HTTP_OK).json(api.results(null, HTTP_OK, { req }))
    } catch (err) {
      await t.rollback()
      console.error('Update secret note error:', err)
      res
        .status(INTERNAL_SERVER_ERROR)
        .json({ success: false, message: err.message })
    }
  }

  static async toggleFavoriteSecretNote(req, res) {
    const t = await db.sequelize.transaction()
    try {
      const userId = req.user.userId
      const { target_id } = req.body

      const type = 'note'

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
