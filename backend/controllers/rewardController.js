const User = require("../models/user");

const getRewards = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("points name");
    
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.status(200).json({ points: user.points, name: user.name });
  } catch (err) {
    console.error("Get Rewards Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

const updatePoints = async (req, res) => {
  try {
    const { id } = req.params; // User ID
    const { pointsToAdd } = req.body;

    if (!pointsToAdd || isNaN(pointsToAdd)) {
      return res.status(400).json({ msg: "Valid points to add are required" });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    user.points += Number(pointsToAdd);
    await user.save();

    res.status(200).json({ msg: "Points updated successfully", points: user.points });
  } catch (err) {
    console.error("Update Points Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

module.exports = {
  getRewards,
  updatePoints
};
