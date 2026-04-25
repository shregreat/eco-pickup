const express = require("express");
const { auth } = require("../middleware/authMiddleware");
const { roleMiddleware } = require("../middleware/roleMiddleware");
const { getProfile, getAllUsers, getLeaderboard } = require("../controllers/userController");

const router = express.Router();

router.get("/profile", auth, getProfile);
router.get("/", auth, roleMiddleware(["admin"]), getAllUsers);
router.get("/leaderboard", auth, getLeaderboard);

module.exports = router;
