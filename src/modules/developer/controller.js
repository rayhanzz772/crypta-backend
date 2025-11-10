const db = require("../../../db/models");
const { HttpStatusCode } = require('axios')
const HTTP_OK = HttpStatusCode?.Ok || 200
const api = require('../../utils/api');

class Controller {
  static async GenerateKey(req, res) {
    const t = await db.sequelize.transaction();
    try {
      const existingKeys = await db.ApiKey.count({ where: { user_id: req.user.userId, revoked: false } });
      if (existingKeys >= 3) {
        return res.status(400).json({ message: 'Key limit reached. Revoke one before generating a new key.' });
      }

      const rawKey = require('crypto').randomBytes(32).toString('hex');
      const key = `api-dev-${rawKey}`;
      const newKey = await db.ApiKey.create({ user_id: req.user.userId, key });

      return res.status(201).json({
        success: true,
        message: 'API key generated successfully',
        data: {
          key: newKey.key,
          status: 201
        }
      });
    } catch (err) {
      await t.rollback();
      console.error("Create secret note error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async GetApiKeys(req, res) {
    const t = await db.sequelize.transaction();
    try {
      const keys = await db.ApiKey.findAll({
        where: { user_id: req.user.userId },
        attributes: ['id', 'key', 'revoked', 'created_at']
      });

      return res.status(HTTP_OK).json(api.results(keys, HTTP_OK, { req }))
    } catch (err) {
      await t.rollback();
      console.error("Create secret note error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async RevokeApiKey(req, res) {
    const t = await db.sequelize.transaction();
    try {
      const key = await db.ApiKey.findOne({
        where: { id: req.params.id, user_id: req.user.userId }
      });
      if (!key) return res.status(404).json({ message: 'Key not found' });

      key.revoked = true;
      await key.save();
      return res.status(HTTP_OK).json({ success: true, message: "API key revoked successfully" });
    } catch (err) {
      await t.rollback();
      console.error("Create secret note error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = Controller;