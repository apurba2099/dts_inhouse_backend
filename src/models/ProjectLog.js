const mongoose = require("mongoose");

const projectLogSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    projectName: {
      type: String,
      required: true,
      trim: true,
    },
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
    status: {
      type: String,
      enum: ["Yet to Start", "In Progress", "Complete", "Cancelled"],
      default: "In Progress",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProjectLog", projectLogSchema);
