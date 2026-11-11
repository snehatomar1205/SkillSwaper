
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const {
  createComment,
  getCommentsByPost,
  updateComment,
  deleteComment,
} = require("../controllers/commentController");

router.post("/:postId", auth, createComment);
router.get("/:postId", getCommentsByPost);

// Edit or delete a comment
router.patch("/edit/:commentId", auth, updateComment);
router.delete("/delete/:commentId", auth, deleteComment);

module.exports = router;
