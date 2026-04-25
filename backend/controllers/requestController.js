const Request = require("../models/request");
const User = require("../models/user");

const createRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { description, location, pickupType, address, wasteCategory, preferredDate } = req.body;
    let imageUrl = req.body.imageUrl || "";

    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ msg: "User is no longer valid" });
    }

    const newRequest = await Request.create({
      userId,
      description,
      location,
      imageUrl,
      pickupType,
      address,
      wasteCategory,
      preferredDate
    });

    if (newRequest) {
      return res.status(200).json({
        msg: "New request logged successfully",
        reqId: newRequest._id
      });
    } else {
      return res.status(400).json({ msg: "Please try again" });
    }
  } catch (err) {
    console.error("Create Request Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

const getMyRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const allRequests = await Request.find({ userId }).sort({ createdAt: -1 });

    if (!allRequests) {
      return res.status(400).json({ msg: "No requests found" });
    }

    res.status(200).json({
      msg: "Here are all your requests",
      allRequests
    });
  } catch (err) {
    console.error("Get My Requests Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

const getAllRequests = async (req, res) => {
  try {
    const allRequests = await Request.find().populate("userId", "name email").sort({ createdAt: -1 });

    res.status(200).json({
      msg: "All requests fetched",
      allRequests
    });
  } catch (err) {
    console.error("Get All Requests Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

const getRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await Request.findById(id).populate("userId", "name email");

    if (!request) {
      return res.status(404).json({ msg: "Request not found" });
    }

    // Security: Only admin/worker or the owner can view this request
    if (req.user.role === "user" && request.userId._id.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized to view this request" });
    }

    res.status(200).json({ request });
  } catch (err) {
    console.error("Get Request By ID Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

const updateRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedWorker } = req.body;

    const request = await Request.findById(id);

    if (!request) {
      return res.status(404).json({ msg: "Request not found" });
    }

    // Role-based logic
    if (req.user.role === "admin") {
      if (status) request.status = status;
      if (assignedWorker) request.assignedWorker = assignedWorker;
    } else if (req.user.role === "worker") {
      // Workers can only update status of their assigned tasks
      if (request.assignedWorker !== req.user.id && request.assignedWorker !== req.user.email) {
        return res.status(403).json({ msg: "Not assigned to this task" });
      }
      if (status) request.status = status;
    } else {
      return res.status(403).json({ msg: "Not authorized to update requests" });
    }

    await request.save();

    res.status(200).json({ msg: "Request updated successfully", request });
  } catch (err) {
    console.error("Update Request Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

const getWorkerTasks = async (req, res) => {
  try {
    // Workers can be assigned by ID or email, check both based on implementation. 
    // Assuming assignedWorker stores the worker's ID or email. Let's assume ID for robustness, or fallback to email.
    const allRequests = await Request.find({
      $or: [
        { assignedWorker: req.user.id },
        { assignedWorker: req.user.email }
      ]
    }).sort({ createdAt: -1 });

    res.status(200).json({
      msg: "Assigned tasks fetched",
      allRequests
    });
  } catch (err) {
    console.error("Get Worker Tasks Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

const rateRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ msg: "Please provide a valid rating between 1 and 5." });
    }

    const request = await Request.findById(id);
    if (!request) return res.status(404).json({ msg: "Request not found" });
    
    // Check if task is completed
    if (request.status !== "Completed" && request.workerStatus !== "Completed") {
      return res.status(400).json({ msg: "You can only rate completed tasks." });
    }
    
    // Check if already rated
    if (request.userRating) {
      return res.status(400).json({ msg: "You have already rated this task." });
    }

    request.userRating = rating;
    await request.save();

    // Update worker's average rating
    if (request.assignedWorker) {
      const worker = await User.findById(request.assignedWorker);
      if (worker) {
        const total = worker.totalRatings || 0;
        const currentAvg = worker.averageRating || 0;
        
        worker.averageRating = ((currentAvg * total) + rating) / (total + 1);
        worker.totalRatings = total + 1;
        await worker.save();
      }
    }

    res.status(200).json({ msg: "Rating submitted successfully", request });
  } catch (err) {
    console.error("Rate Request Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

module.exports = {
  createRequest,
  getMyRequests,
  getAllRequests,
  getRequestById,
  updateRequest,
  getWorkerTasks,
  rateRequest
};
