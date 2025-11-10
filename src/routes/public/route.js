const express = require("express");
const router = express.Router();
const { apiKeyAuth } = require("../../middleware/authMiddleware");
const { publicLimiter } = require("../../middleware/rateLimiter");

router.get("/status", (req, res) => {
  res.send("Running ⚡");
});

router.use( apiKeyAuth );
router.use( publicLimiter );
router.use("/users", require("../../modules/user/index"));
router.use("/categories", require("../../modules/category/index"));
router.use("/vault", require("../../modules/vault-password/index"));
router.use("/notes", require("../../modules/secret-note/index"));
router.use("/tags", require("../../modules/tag/index"));

module.exports = router;
