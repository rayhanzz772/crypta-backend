const db = require("../../../db/models");
const { HttpStatusCode } = require('axios')
const HTTP_OK = HttpStatusCode?.Ok || 200
const api = require('../../utils/api')

class Controller {
  static async createCategory(req, res) {
    const t = await db.sequelize.transaction();
    try {
      const { name } = req.body;
      const userId = req.user.userId;
      console.log("Creating category for user:", userId);

      const item = await db.Category.create({
        name: name,
      },
        { transaction: t }
      );

      if (!item) {
        throw new Error("Failed to create category");
      }

      await t.commit();

      return res.status(HTTP_OK).json(api.results(null, HTTP_OK, { req }))
    } catch (error) {
      await t.rollback();
      console.error("Error creating category:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  static async getCategories(req, res) {
    try {
      const categories = await db.Category.findAll();

      return res.status(HTTP_OK).json(api.results(categories, HTTP_OK, { req }))
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

}

module.exports = Controller;