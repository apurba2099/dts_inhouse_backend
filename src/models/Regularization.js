const mongoose = require("mongoose");

const regularizationSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["regularization", "permission"],
      required: true,
    },
    date: {
      type: String, // "YYYY-MM-DD"
      required: true,
    },
    checkInTime: {
      type: String, // "HH:MM"
    },
    checkOutTime: {
      type: String, // "HH:MM"
    },
    reason: {
      type: String,
      required: [true, "Reason is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Regularization", regularizationSchema);
