const mongoose = require("mongoose");

const projectLogSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String,
      required: true,
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
      default: 1,
    },
    startDate: {
      type: String,
    },
    dueDate: {
      type: String,
    },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Yet to Start", "In Progress", "Complete", "Cancelled", "Canceled"],
      default: "In Progress",
    },
    department: {
      type: String,
      default: "",
    },
    color: {
      type: String,
      default: "blue",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProjectLog", projectLogSchema);
