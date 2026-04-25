const Request = require("../models/request");
const User = require("../models/user");
const WorkerProfile = require("../models/workerProfile");
const { sendNotificationEmail } = require("../utils/emailService");

const getAssignedTasks = async (req, res) => {
  try {
    const tasks = await Request.find({ assignedWorker: req.user.id }).populate("userId", "name email");
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

const updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { workerStatus, rejectionReason, proofImageUrl } = req.body;

    const request = await Request.findOne({ _id: taskId, assignedWorker: req.user.id });
    if (!request) {
      return res.status(404).json({ message: "Assigned task not found" });
    }

    // Handle rejection
    if (workerStatus === "Rejected") {
      request.workerStatus = "Rejected";
      request.rejectionReason = rejectionReason;
      request.assignedWorker = null; // Unassign worker
      request.status = "Pending"; // Back to pending for admin
    } else {
      request.workerStatus = workerStatus;
      
      // Sync overarching status
      if (workerStatus === "Completed") {
        request.status = "Completed";
        request.proofImageUrl = proofImageUrl || request.proofImageUrl;
        
        // Reward User Points automatically
        const user = await User.findById(request.userId);
        if (user) {
          user.points += 50; // Give 50 points per pickup
          await user.save();
        }
      } else if (workerStatus === "Started") {
        request.status = "In Progress";
      }
    }

    await request.save();

    // Update worker profile task count if task is no longer in progress
    if (workerStatus === "Completed" || workerStatus === "Rejected") {
      const workerProfile = await WorkerProfile.findOne({ userId: req.user.id });
      if (workerProfile && workerProfile.currentTaskCount > 0) {
        workerProfile.currentTaskCount -= 1;
        await workerProfile.save();
      }
    }

    // Emit Socket Notification
    const io = req.app.get("io");
    if (io) {
      if (workerStatus === "Completed") {
        io.emit("notification", { message: `Request ${request._id.toString().slice(-4)} completed! You earned 50 points.`, userId: request.userId });
      } else {
        io.emit("notification", { message: `Worker has updated your request status to: ${workerStatus}`, userId: request.userId });
      }
    }

    const user = await User.findById(request.userId);
    if (user && user.email) {
      if (workerStatus === "Completed") {
        await sendNotificationEmail(user.email, "Request Completed & Points Awarded!", `Your request at ${request.location} has been successfully completed. 50 Eco Points have been added to your account!`);
      } else if (workerStatus === "Started") {
        await sendNotificationEmail(user.email, "Worker on the way!", `The worker has started the task at ${request.location} and is currently on the way.`);
      }
    }

    res.json({ message: "Task status updated", request });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

const updateAvailability = async (req, res) => {
  try {
    const { availability } = req.body;
    if (!["Available", "Busy", "Offline"].includes(availability)) {
      return res.status(400).json({ message: "Invalid availability status" });
    }

    const workerProfile = await WorkerProfile.findOne({ userId: req.user.id });
    if (!workerProfile) return res.status(404).json({ message: "Worker profile not found" });

    workerProfile.availability = availability;
    await workerProfile.save();

    res.json({ message: "Availability updated", availability: workerProfile.availability });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

const getWorkerLeaderboard = async (req, res) => {
  try {
    const allWorkers = await User.find({ role: "worker", isVerified: true }).select("name email").lean();
    
    const workersWithPerformance = await Promise.all(allWorkers.map(async (worker) => {
      const completedTasks = await Request.countDocuments({
        assignedWorker: worker._id,
        workerStatus: "Completed"
      });
      
      const profile = await WorkerProfile.findOne({ userId: worker._id }).lean();
      
      return { 
        ...worker, 
        completedTasks,
        averageRating: profile ? profile.averageRating : 0,
        totalRatings: profile ? profile.totalRatings : 0
      };
    }));
    
    // Sort by completed tasks
    const topWorkers = workersWithPerformance.sort((a, b) => b.completedTasks - a.completedTasks).slice(0, 10);
    res.json(topWorkers);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

module.exports = {
  getAssignedTasks,
  updateTaskStatus,
  updateAvailability,
  getWorkerLeaderboard
};
