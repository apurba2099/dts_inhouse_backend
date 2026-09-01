const Regularization = require("../models/Regularization");
const apiResponse = require("../utils/apiResponse");
const {
  createNotification,
  notifyAdmins,
  formatDate,
} = require("../services/notification.service");

//Employee: submit a new regularization/permission request
const createRequest = async (req, res) => {
  try {
    const { type, date, checkInTime, checkOutTime, reason } = req.body;

    if (!type || !["regularization", "permission"].includes(type)) {
      return apiResponse.error(res, 400, "Type must be 'regularization' or 'permission'");
    }
    if (!date || !reason || !reason.trim()) {
      return apiResponse.error(res, 400, "Date and reason are required");
    }

    const request = await Regularization.create({
      employee: req.user._id,
      type,
      date,
      checkInTime,
      checkOutTime,
      reason: reason.trim(),
    });

    // Notify all active admins about the new regularization/permission request
    await notifyAdmins({
      sender: req.user._id,
      title: "New Regularization Request",
      message: `${req.user.name} (${req.user.employeeId}) has submitted a ${
        type === "permission" ? "permission" : "attendance regularization"
      } request.`,
      type: "regularization_request",
      metadata: {
        regularizationId: request._id,
        employeeId: req.user._id,
        date,
        relatedRoute: "/attendance/regularization",
      },
    });

    return apiResponse.success(res, 201, "Request submitted", request);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Employee: get my own requests
const getMyRequests = async (req, res) => {
  try {
    const requests = await Regularization.find({ employee: req.user._id }).sort({
      createdAt: -1,
    });
    return apiResponse.success(res, 200, "Requests fetched", requests);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

//  Admin: get all regularization/permission requests
const getAllRequests = async (req, res) => {
  try {
    const requests = await Regularization.find()
      .populate("employee", "name employeeId")
      .sort({ createdAt: -1 });
    return apiResponse.success(res, 200, "All requests fetched", requests);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Admin: approve or reject a request
const updateRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return apiResponse.error(res, 400, "Status must be 'approved' or 'rejected'");
    }

    const request = await Regularization.findById(req.params.id);
    if (!request) {
      return apiResponse.error(res, 404, "Request not found");
    }

    request.status = status;
    request.reviewedBy = req.user._id;
    await request.save();

    // Notify the employee who submitted the request
    const requestLabel =
      request.type === "permission" ? "permission" : "attendance regularization";
    await createNotification({
      recipient: request.employee,
      sender: req.user._id,
      title:
        status === "approved"
          ? `${requestLabel === "permission" ? "Permission" : "Regularization"} Request Approved`
          : `${requestLabel === "permission" ? "Permission" : "Regularization"} Request Rejected`,
      message: `Your ${requestLabel} request for ${formatDate(request.date)} has been ${status}.`,
      type:
        status === "approved"
          ? "regularization_approved"
          : "regularization_rejected",
      metadata: {
        regularizationId: request._id,
        date: request.date,
        relatedRoute: "/attendance/regularization",
      },
    });

    return apiResponse.success(res, 200, `Request ${status}`, request);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

module.exports = {
  createRequest,
  getMyRequests,
  getAllRequests,
  updateRequestStatus,
};