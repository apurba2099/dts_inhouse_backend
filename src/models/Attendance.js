const mongoose = require("mongoose");

const breakSchema = new mongoose.Schema(
  {
    startTime: { type: Date, required: true },
    plannedEndTime: { type: Date },
    endTime: { type: Date },
    reason: { type: String, required: true, trim: true },
  },
  { _id: true }
);

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String, // stored as "YYYY-MM-DD" for easy day-level lookup
      required: true,
    },
    checkIn: { type: Date },
    checkOut: { type: Date },
    breaks: [breakSchema],
    status: {
      type: String,
      enum: ["present", "on-break", "absent"],
      default: "present",
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);