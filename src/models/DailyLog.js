const mongoose = require("mongoose");

const dailyLogSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    employeeName: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      default: "blue",
    },
    project: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    actualHours: {
      type: Number,
      required: true,
      min: 0.1,
      max: 24,
      default: 8,
    },
    startDate: {
      type: String,
      required: true,
    },
    dueDate: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "High",
    },
    status: {
      type: String,
      enum: ["Complete", "In Progress", "Yet to Start", "Cancelled"],
      default: "Complete",
    },
    department: {
      type: String,
      default: "",
    },
    isDocLink: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DailyLog", dailyLogSchema);
