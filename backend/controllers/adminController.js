const User = require("../models/user");
const Request = require("../models/request");
const WorkerProfile = require("../models/workerProfile");
const { sendNotificationEmail, sendVerificationEmail } = require("../utils/emailService");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalWorkers = await User.countDocuments({ role: "worker" });
    
    const totalRequests = await Request.countDocuments();
    const pendingRequests = await Request.countDocuments({ status: "Pending" });
    const completedRequests = await Request.countDocuments({ status: "Completed" });
    
    const availableWorkers = await WorkerProfile.countDocuments({ availability: "Available" });
    const busyWorkers = await WorkerProfile.countDocuments({ availability: "Busy" });

    res.json({
      totalUsers,
      totalWorkers,
      availableWorkers,
      busyWorkers,
      totalRequests,
      pendingRequests,
      completedRequests
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

const getAllWorkers = async (req, res) => {
  try {
    const workers = await User.find({ role: "worker", isVerified: true }).select("-password -verificationToken").lean();
    
    // Calculate performance and attach profile data
    const workersWithPerformance = await Promise.all(workers.map(async (worker) => {
      const completedTasks = await Request.countDocuments({
        assignedWorker: worker._id,
        workerStatus: "Completed"
      });
      const profile = await WorkerProfile.findOne({ userId: worker._id }).lean();
      
      return { 
        ...worker, 
        completedTasks,
        availability: profile ? profile.availability : "Offline",
        averageRating: profile ? profile.averageRating : 0
      };
    }));

    res.json(workersWithPerformance);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

const assignWorker = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { workerId } = req.body;

    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    const worker = await User.findOne({ _id: workerId, role: "worker" });
    if (!worker) {
      return res.status(404).json({ message: "Worker not found" });
    }
    if (!worker.isVerified) {
      return res.status(403).json({ message: "Cannot assign task. Worker is not verified." });
    }

    request.assignedWorker = worker._id;
    request.status = "In Progress";
    request.workerStatus = "Assigned";
    await request.save();

    // Update worker profile
    const workerProfile = await WorkerProfile.findOne({ userId: worker._id });
    if (workerProfile) {
      workerProfile.currentTaskCount += 1;
      await workerProfile.save();
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("notification", { message: `You have been assigned a new pickup task in ${request.location || 'your area'}.`, userId: worker._id });
      io.emit("notification", { message: `A worker has been assigned to your request!`, userId: request.userId });
    }

    const user = await User.findById(request.userId);
    if (user && user.email) {
      await sendNotificationEmail(user.email, "Worker Assigned", `Great news! A worker (${worker.name}) has been assigned to your request at ${request.location}. They will arrive soon.`);
    }
    if (worker && worker.email) {
      const emailHtml = `
        <h3>New Pickup Task Assigned</h3>
        <p>You have been assigned a new task. Please review the details below:</p>
        <ul>
          <li><strong>Location:</strong> ${request.location || 'N/A'}</li>
          <li><strong>Address:</strong> ${request.address || 'N/A'}</li>
          <li><strong>Category:</strong> ${request.wasteCategory || 'General'}</li>
          <li><strong>Pickup Type:</strong> ${request.pickupType || 'home'}</li>
          <li><strong>Description:</strong> ${request.description || 'No description provided'}</li>
        </ul>
        <p>Please log in to your dashboard to view the map and start the task.</p>
      `;
      await sendNotificationEmail(worker.email, "New Task Assigned", emailHtml);
    }

    res.json({ message: "Worker assigned successfully", request });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

const createWorker = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const newWorker = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: "worker",
      isVerified: false, // Worker must verify their email
      verificationToken,
      verificationTokenExpiry,
      availability: "Available"
    });

    try {
      await sendVerificationEmail(newWorker.email, verificationToken);
    } catch (emailError) {
      console.error("Failed to send worker verification email:", emailError);
    }

    res.status(201).json({
      message: "Worker created successfully. Verification email sent.",
      worker: {
        id: newWorker._id,
        name: newWorker.name,
        email: newWorker.email
      }
    });

  } catch (e) {
    console.error("Create Worker Error:", e);
    res.status(500).json({ message: "Server error" });
  }
};

const getAdminLeaderboards = async (req, res) => {
  try {
    const topUsers = await User.find({ role: "user" }).select("name points email").sort({ points: -1 }).limit(5);
    
    // For workers, we need to calculate completed tasks
    const allWorkers = await User.find({ role: "worker", isVerified: true }).select("name email").lean();
    const workersWithPerformance = await Promise.all(allWorkers.map(async (worker) => {
      const completedTasks = await Request.countDocuments({
        assignedWorker: worker._id,
        workerStatus: "Completed"
      });
      return { ...worker, completedTasks };
    }));
    
    // Sort workers in memory by completed tasks
    const topWorkers = workersWithPerformance.sort((a, b) => b.completedTasks - a.completedTasks).slice(0, 5);

    res.json({ topUsers, topWorkers });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

module.exports = {
  getDashboardStats,
  getAllWorkers,
  assignWorker,
  getAllUsers,
  createWorker,
  getAdminLeaderboards
};
