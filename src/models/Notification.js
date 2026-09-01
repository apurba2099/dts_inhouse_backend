const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: [
        "leave_approved",
        "leave_rejected",
        "leave_request",
        "regularization_approved",
        "regularization_rejected",
        "regularization_request",
        "holiday",
        "announcement",
        "attendance",
        "project_assignment",
        "system",
      ],
      default: "system",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    // Flexible container for related data (leaveId, regularizationId, date, relatedRoute, ...)
    metadata: {
      leaveId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Leave",
      },
      regularizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Regularization",
      },
      employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      date: {
        type: String, // "YYYY-MM-DD"
      },
      relatedRoute: {
        type: String, // frontend route to open when the notification is clicked
      },
    },
  },
  { timestamps: true }
);

// Efficient queries: list by recipient (newest first) + unread badge counts
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
