const express = require("express");
const router = express.Router();

router.get("/status", (req, res) => {
  res.send("Running ⚡");
});

router.use("/users", require("./modules/user/index"));
router.use("/categories", require("./modules/category/index"));
router.use("/vault", require("./modules/vault-password/index"));

module.exports = router;
