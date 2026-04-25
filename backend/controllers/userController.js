const User = require("../models/user");

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -verificationToken -verificationTokenExpiry");
    
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.status(200).json({ user });
  } catch (err) {
    console.error("Get Profile Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password -verificationToken -verificationTokenExpiry");

    res.status(200).json({ users });
  } catch (err) {
    console.error("Get All Users Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    const topUsers = await User.find({ role: "user" })
      .select("name points")
      .sort({ points: -1 })
      .limit(10);
    res.status(200).json(topUsers);
  } catch (err) {
    console.error("Leaderboard Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

module.exports = {
  getProfile,
  getAllUsers,
  getLeaderboard
};
