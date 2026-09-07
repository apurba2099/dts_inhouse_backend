const Leave = require("../models/Leave");
// const Holiday = require("../models/Holiday");
const apiResponse = require("../utils/apiResponse");
const { LEAVE_ENTITLEMENTS } = require("../config/constants");
const { istTodayString } = require("../utils/istDate");
const {
  createNotification,
  notifyAdmins,
  formatDate,
} = require("../services/notification.service");

// Inclusive day count of [startDate, endDate] clipped to the given calendar
// year. All inputs are "YYYY-MM-DD" strings; UTC math avoids DST shifts.
const countDaysInYear = (startDate, endDate, year) => {
  const from = startDate > `${year}-01-01` ? startDate : `${year}-01-01`;
  const to = endDate < `${year}-12-31` ? endDate : `${year}-12-31`;
  if (from > to) return 0;
  const ms = new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`);
  return Math.round(ms / 86400000) + 1;
};


// Employee: submit a new leave request
const createLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;

    if (!startDate || !endDate || !reason || !reason.trim()) {
      return apiResponse.error(res, 400, "Start date, end date, and reason are required");
    }

    if (new Date(endDate) < new Date(startDate)) {
      return apiResponse.error(res, 400, "End date cannot be before start date");
    }

    // Quietly map Floating Holiday to Casual Leave type without altering schema
    const normalizedLeaveType =
      leaveType === "Floating Holiday" || leaveType === "Floating"
        ? "Casual"
        : (leaveType || "Casual");

    const leave = await Leave.create({
      employee: req.user._id,
      leaveType: normalizedLeaveType,
      startDate,
      endDate,
      reason: reason.trim(),
    });

    // Notify all active admins about the new leave request
    await notifyAdmins({
      sender: req.user._id,
      title: "New Leave Request",
      message: `${req.user.name} (${req.user.employeeId}) has submitted a leave request.`,
      type: "leave_request",
      metadata: {
        leaveId: leave._id,
        employeeId: req.user._id,
        relatedRoute: "/leave",
      },
    });

    return apiResponse.success(res, 201, "Leave request submitted", leave);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Employee: get my own leave requests
const getMyLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ employee: req.user._id }).sort({ createdAt: -1 });
    return apiResponse.success(res, 200, "Leave requests fetched", leaves);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Admin: get all leave requests
const getAllLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find()
      .populate("employee", "name employeeId")
      .sort({ createdAt: -1 });
    return apiResponse.success(res, 200, "All leave requests fetched", leaves);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Admin: approve or reject a leave request
const updateLeaveStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return apiResponse.error(res, 400, "Status must be 'approved' or 'rejected'");
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return apiResponse.error(res, 404, "Leave request not found");
    }


    leave.status = status;
    leave.reviewedBy = req.user._id;
    await leave.save();

    // Notify the employee who submitted the request
    const dateRange = `${formatDate(leave.startDate)} to ${formatDate(leave.endDate)}`;
    await createNotification({
      recipient: leave.employee,
      sender: req.user._id,
      title:
        status === "approved"
          ? "Leave Request Approved"
          : "Leave Request Rejected",
      message:
        status === "approved"
          ? `Your leave request from ${dateRange} has been approved.`
          : `Your leave request from ${dateRange} has been rejected.`,
      type: status === "approved" ? "leave_approved" : "leave_rejected",
      metadata: {
        leaveId: leave._id,
        relatedRoute: "/leave",
      },
    });

    return apiResponse.success(res, 200, `Leave request ${status}`, leave);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Employee: annual leave balance for the current calendar year.
// Only approved requests consume balance; pending/rejected do not.
const getLeaveBalance = async (req, res) => {
  try {
    const year = Number(istTodayString().split("-")[0]);
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    const approvedLeaves = await Leave.find({
      employee: req.user._id,
      status: "approved",
      startDate: { $gte: yearStart, $lte: yearEnd },
    });

    // Used days per type, counting only the portion inside this calendar year
    // Combined pool — Casual and Sick both draw from the same annual quota
    let used = 0;
    for (const leave of approvedLeaves) {
      used += countDaysInYear(leave.startDate, leave.endDate, year);
    }

    const entitlement = LEAVE_ENTITLEMENTS.TOTAL;
    const available = Math.max(entitlement - used, 0);

    return apiResponse.success(res, 200, "Leave balance fetched", {
      year,
      entitlement,
      used,
      available,
    });

  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

module.exports = {
  createLeave,
  getMyLeaves,
  getAllLeaves,
  updateLeaveStatus,
  getLeaveBalance,
};