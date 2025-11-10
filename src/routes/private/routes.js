const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../../middleware/authMiddleware");

router.get("/status", (req, res) => {
  res.send("Running ⚡");
});

router.use(authMiddleware);
router.use("/users", require("../../modules/user/index"));
router.use("/categories", require("../../modules/category/index"));
router.use("/vault", require("../../modules/vault-password/index"));
router.use("/notes", require("../../modules/secret-note/index"));
router.use("/tags", require("../../modules/tag/index"));
router.use("/developer", require("../../modules/developer/index"));

module.exports = router;
