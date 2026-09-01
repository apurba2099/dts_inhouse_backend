const Notification = require("../models/Notification");
const User = require("../models/User");
const logger = require("../config/logger");

// Format a "YYYY-MM-DD" string as "25 Aug 2026" for notification messages
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Create a single notification.
// Never throws - notification failures must not break the main flow (leave/regularization).
const createNotification = async ({
  recipient,
  sender,
  title,
  message,
  type,
  metadata,
}) => {
  try {
    return await Notification.create({
      recipient,
      sender,
      title,
      message,
      type,
      metadata,
    });
  } catch (err) {
    logger.error(`Failed to create notification: ${err.message}`);
    return null;
  }
};

// Create the same notification for all active admin users (e.g. new requests)
const notifyAdmins = async ({ sender, title, message, type, metadata }) => {
  try {
    const admins = await User.find({ role: "admin", isActive: true }).select(
      "_id"
    );
    if (!admins.length) return [];

    const docs = admins.map((admin) => ({
      recipient: admin._id,
      sender,
      title,
      message,
      type,
      metadata,
    }));

    return await Notification.insertMany(docs);
  } catch (err) {
    logger.error(`Failed to notify admins: ${err.message}`);
    return [];
  }
};

module.exports = { createNotification, notifyAdmins, formatDate };
