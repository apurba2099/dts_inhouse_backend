const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    leaveType: {
      type: String,
      // "Floating Holiday": avails one of the 2 optional/floating holidays
      // per calendar year (date must match an active floating holiday).
      enum: ["Casual", "Sick", "Emergency", "Earned", "Floating Holiday"],
      default: "Casual",
    },
    startDate: {
      type: String, // "YYYY-MM-DD"
      required: true,
    },
    endDate: {
      type: String, // "YYYY-MM-DD"
      required: true,
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

module.exports = mongoose.model("Leave", leaveSchema);