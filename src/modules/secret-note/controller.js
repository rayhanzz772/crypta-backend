const db = require("../../../db/models");
const { HttpStatusCode } = require('axios')
const SecretNote = db.SecretNote;
const api = require('../../utils/api')
const HTTP_OK = HttpStatusCode?.Ok || 200
const INTERNAL_SERVER_ERROR = HttpStatusCode?.InternalServerError || 500
const NOT_FOUND = HttpStatusCode?.NotFound || 404
const BAD_REQUEST = HttpStatusCode?.BadRequest || 400
const { encrypt, decrypt } = require("../../utils/encryption");

class Controller {
  static async createSecretNote(req, res) {
    const t = await db.sequelize.transaction();
    try {
      const { title, note, master_password, category_id, tags = [] } = req.body;
      const userId = req.user.userId;

      if (!master_password) {
        return res.status(400).json({ success: false, message: "Master password required for encryption" });
      }

      const kdfType = "argon2id";
      const kdfParams = {
        memoryCost: 2 ** 16,
        timeCost: 3,
        parallelism: 1,
      };

      const { data: encryptedNote, salt } = await encrypt(note, master_password);

      const item = await SecretNote.create({
        user_id: userId,
        title,
        note: encryptedNote,
        salt,
        category_id: category_id || null,
        kdf_type: kdfType,
        kdf_params: kdfParams
      },
        { transaction: t }
      );

      if (tags.length > 0) {
        const tagRecords = [];

        for (const tagName of tags) {
          const [tag] = await db.Tag.findOrCreate({
            where: { name: tagName.trim() },
            defaults: { name: tagName.trim() },
            transaction: t,
          });
          tagRecords.push(tag);
        }
        await item.addTags(tagRecords, { transaction: t });
      }


      if (!item) {
        throw new Error("Failed to create secret note");
      }

      await t.commit();

      return res.status(HTTP_OK).json(api.results(null, HTTP_OK, { req }))
    } catch (err) {
      await t.rollback();
      console.error("Create secret note error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getSecretNotes(req, res) {
    try {
      const userId = req.user.userId;

      const limit = parseInt(req.query.per_page?.trim()) || 10
      const page = parseInt(req.query.page?.trim()) || 1
      const offset = (page - 1) * limit

      const replacements = { userId, limit, offset }

      const category = req.query.category ? req.query.category?.trim() : null

      const q = req.query.q ? req.query.q?.trim() : null
      const where = ['sn.user_id = :userId AND sn.deleted_at IS NULL']

      if (q) {
        where.push("(sn.title ILIKE :search OR sn.note ILIKE :search)")
        replacements.search = `%${q}%`
      }

      if (category) {
        where.push("c.name = :category")
        replacements.category = category
      }

      const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : ""

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
          ) AS tags
        FROM secret_notes sn
        LEFT JOIN note_tags snt ON sn.id = snt.note_id
        LEFT JOIN tags t ON snt.tag_id = t.id
        LEFT JOIN categories c ON sn.category_id = c.id
        ${whereClause}
        GROUP BY sn.id, c.name
        ORDER BY sn.created_at DESC
        `,
        {
          replacements,
          type: db.Sequelize.QueryTypes.SELECT,
        }
      );

      return res.status(HTTP_OK).json(api.results(notes, HTTP_OK, { req }))
    } catch (err) {
      console.error("Get secret notes error:", err);
      res.status(INTERNAL_SERVER_ERROR).json({ success: false, message: err.message });
    }
  }

  static async decryptSecretNote(req, res) {
    try {
      const { id } = req.params;
      const { master_password } = req.body;
      const userId = req.user.userId;

      if (!master_password) {
        return res.status(BAD_REQUEST).json({ success: false, message: "Master password is required for decryption" });
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
          type: db.Sequelize.QueryTypes.SELECT,
        }
      );

      if (!notes || notes.length === 0) {
        return res.status(NOT_FOUND).json({ success: false, message: "Secret note not found" });
      }

      const { kdf_type, kdf_params, salt } = notes[0];

      const decryptedNote = await decrypt(notes[0].note, master_password, salt, kdf_type, kdf_params);

      const items = {
        id: notes[0].id,
        title: notes[0].title,
        tags: notes[0].tags,
        note: decryptedNote
      }

      return res.status(HTTP_OK).json(api.results(items, HTTP_OK, { req }))
    } catch (err) {
      console.error("Decrypt secret note error:", err);
      res.status(INTERNAL_SERVER_ERROR).json({ success: false, message: err.message });
    }
  }

  static async deleteSecretNote(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const result = await db.sequelize.query(
        `
        UPDATE secret_notes
        SET deleted_at = NOW()
        WHERE id = :id AND user_id = :userId AND deleted_at IS NULL
        `,
        {
          replacements: { id, userId },
          type: db.Sequelize.QueryTypes.UPDATE,
        }
      );

      if (result[0] === 0) {
        return res.status(NOT_FOUND).json({ success: false, message: "Secret note not found or already deleted" });
      }

      return res.status(HTTP_OK).json({ success: true, message: "Secret note deleted successfully" });
    } catch (err) {
      console.error("Delete secret note error:", err);
      res.status(INTERNAL_SERVER_ERROR).json({ success: false, message: err.message });
    }
  }

  static async updateSecretNote(req, res) {
    const t = await db.sequelize.transaction();
    try {
      const { id } = req.params;
      const { title, note, master_password, category_id, tags = [] } = req.body;
      const userId = req.user.userId;

      const updateData = {};

      if (title) updateData.title = title;
      if (category_id !== undefined) updateData.category_id = category_id;

      if (note) {
        if (!master_password) {
          return res.status(BAD_REQUEST).json({ success: false, message: "Master password required for encryption" });
        }

        const { data: encryptedNote, salt } = await encrypt(note, master_password);
        updateData.note = encryptedNote;
        updateData.salt = salt;
      }

      const [updatedRows] = await SecretNote.update(updateData, {
        where: { id, user_id: userId, deleted_at: null },
        transaction: t
      });

      if (updatedRows === 0) {
        await t.rollback();
        return res.status(NOT_FOUND).json({ success: false, message: "Secret note not found or already deleted" });
      }

      const item = await SecretNote.findOne({ where: { id, user_id: userId }, transaction: t });

      if (tags.length > 0) {
        const tagRecords = [];

        for (const tagName of tags) {
          const [tag] = await db.Tag.findOrCreate({
            where: { name: tagName.trim() },
            defaults: { name: tagName.trim() },
            transaction: t,
          });
          tagRecords.push(tag);
        }
        await item.setTags(tagRecords, { transaction: t });
      }

      await t.commit();

      return res.status(HTTP_OK).json(api.results(null, HTTP_OK, { req }))
    } catch (err) {
      await t.rollback();
      console.error("Update secret note error:", err);
      res.status(INTERNAL_SERVER_ERROR).json({ success: false, message: err.message });
    }
  }
}


module.exports = Controller;