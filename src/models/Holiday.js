const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Holiday name is required"],
      trim: true,
    },
    date: {
      type: String, // stored as "YYYY-MM-DD" - avoids UTC timezone shifting
      required: [true, "Holiday date is required"],
    },
    year: {
      type: Number,
      required: [true, "Holiday year is required"],
    },
    // "regular": company-wide off day. "floating": opt-in, employee applies
    // via the leave workflow (max 2 per employee per calendar year).
    type: {
      type: String,
      enum: ["regular", "floating"],
      default: "regular",
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Efficient lookups: by exact date (calendar matching) and by year (list view)
holidaySchema.index({ date: 1 });
holidaySchema.index({ year: 1, isActive: 1 });

module.exports = mongoose.model("Holiday", holidaySchema);
