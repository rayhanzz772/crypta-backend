const express = require("express");
const router = express.Router();
const TagController = require("./controller");
const { authMiddleware } = require("../../middleware/authMiddleware");

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get all tags (with search & pagination)
router.get("/", TagController.getAllTags);

// Get single tag by ID
router.get("/:id", TagController.getTagById);

// Create single tag
router.post("/", TagController.createTag);

// Bulk create tags
router.post("/bulk", TagController.bulkCreateTags);

// Update single tag
router.put("/:id", TagController.updateTag);

// Bulk update tags
router.put("/bulk", TagController.bulkUpdateTags);

// Delete single tag
router.delete("/:id", TagController.deleteTag);

// Bulk delete tags
router.delete("/bulk", TagController.bulkDeleteTags);

module.exports = router;
