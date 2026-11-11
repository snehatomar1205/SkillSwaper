
const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const upload = require("../middleware/multer");

const {
  createSkillPost,
  getAllSkills,
  getSingleSkill,
  updateSkill,
  deleteSkill,
  getMyPosts,
  getPublicProfile,
} = require("../controllers/skillController");

router.get("/", getAllSkills);
router.get("/mine", auth, getMyPosts);
router.post("/", auth, upload.single("image"), createSkillPost);
router.get("/:id", getSingleSkill);
router.patch("/:id", auth, upload.single("image"), updateSkill);
router.delete("/:id", auth, deleteSkill);
router.get("/users/:id/profile", getPublicProfile);

module.exports = router;
