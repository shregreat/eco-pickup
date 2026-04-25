const express = require("express");
const { auth } = require("../middleware/authMiddleware");
const { roleMiddleware } = require("../middleware/roleMiddleware");
const { getRewards, updatePoints } = require("../controllers/rewardController");

const router = express.Router();

router.get("/", auth, getRewards);
router.put("/:id", auth, roleMiddleware(["admin"]), updatePoints);

module.exports = router;
