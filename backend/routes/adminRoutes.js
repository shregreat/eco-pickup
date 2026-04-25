const express = require("express");
const router = express.Router();
const { getDashboardStats, getAllWorkers, assignWorker, getAllUsers, createWorker, getAdminLeaderboards } = require("../controllers/adminController");
const { auth } = require("../middleware/authMiddleware");
const { roleMiddleware } = require("../middleware/roleMiddleware");

router.use(auth);
router.use(roleMiddleware(["admin"]));

router.get("/stats", getDashboardStats);
router.get("/workers", getAllWorkers);
router.post("/workers", createWorker);
router.put("/requests/:requestId/assign", assignWorker);
router.get("/users", getAllUsers);
router.get("/leaderboards", getAdminLeaderboards);

module.exports = router;
