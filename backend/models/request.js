const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    location: {
      type: String,
    },

    pickupType: {
      type: String,
      enum: ["home", "nearby"],
      default: "home",
    },

    address: {
      type: String,
    },

    wasteCategory: {
      type: String,
    },

    preferredDate: {
      type: Date,
    },

    imageUrl: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },

    assignedWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    workerStatus: {
      type: String,
      enum: ["Assigned", "Accepted", "Rejected", "Started", "Completed"],
    },

    proofImageUrl: {
      type: String,
    },

    rejectionReason: {
      type: String,
    },

    userRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Request", requestSchema);