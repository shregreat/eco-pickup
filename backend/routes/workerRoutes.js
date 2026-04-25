const express = require("express");
const router = express.Router();
const { getAssignedTasks, updateTaskStatus, updateAvailability, getWorkerLeaderboard } = require("../controllers/workerController");
const { auth } = require("../middleware/authMiddleware");
const { roleMiddleware } = require("../middleware/roleMiddleware");

router.use(auth);
router.use(roleMiddleware(["worker"]));

router.get("/tasks", getAssignedTasks);
router.put("/tasks/:taskId/status", updateTaskStatus);
router.put("/availability", updateAvailability);
router.get("/leaderboard", getWorkerLeaderboard);

module.exports = router;
