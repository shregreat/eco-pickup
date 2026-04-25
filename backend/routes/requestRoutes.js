const express = require("express");
const { auth } = require("../middleware/authMiddleware");
const { roleMiddleware } = require("../middleware/roleMiddleware");
const {
  createRequest,
  getMyRequests,
  getAllRequests,
  getRequestById,
  updateRequest,
  getWorkerTasks,
  rateRequest
} = require("../controllers/requestController");

const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

// User Routes
router.post("/", auth, upload.single("image"), createRequest);
router.get("/my", auth, getMyRequests);
router.get("/:id", auth, getRequestById);
router.post("/:id/rate", auth, rateRequest);

// Admin Routes
router.get("/", auth, roleMiddleware(["admin"]), getAllRequests);
router.put("/:id", auth, roleMiddleware(["admin", "worker"]), updateRequest);

// Worker Routes
router.get("/tasks/assigned", auth, roleMiddleware(["worker"]), getWorkerTasks);

module.exports = router;
