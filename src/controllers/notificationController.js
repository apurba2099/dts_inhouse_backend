const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const apiResponse = require("../utils/apiResponse");

// Get notifications for the currently logged-in user (with pagination)
const getMyNotifications = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 15, 1),
      50
    );
    const filter = { recipient: req.user._id };

    const [notifications, unreadCount, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments({ recipient: req.user._id, isRead: false }),
      Notification.countDocuments(filter),
    ]);

    return apiResponse.success(res, 200, "Notifications fetched", {
      notifications,
      unreadCount,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Unread count only (used by the bell badge polling)
const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });
    return apiResponse.success(res, 200, "Unread count fetched", {
      unreadCount,
    });
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Mark a single notification as read (only the recipient can do this)
const markAsRead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return apiResponse.error(res, 400, "Invalid notification id");
    }

    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return apiResponse.error(res, 404, "Notification not found");
    }

    notification.isRead = true;
    await notification.save();

    return apiResponse.success(
      res,
      200,
      "Notification marked as read",
      notification
    );
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Mark all of the user's notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );

    return apiResponse.success(res, 200, "All notifications marked as read", {
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Delete a notification from the user's list (only the recipient can do this)
const deleteNotification = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return apiResponse.error(res, 400, "Invalid notification id");
    }

    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return apiResponse.error(res, 404, "Notification not found");
    }

    return apiResponse.success(
      res,
      200,
      "Notification deleted",
      notification
    );
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
