const Leave = require("../models/Leave");
const Holiday = require("../models/Holiday");
const apiResponse = require("../utils/apiResponse");
const {
  LEAVE_TYPES,
  LEAVE_ENTITLEMENTS,
} = require("../config/constants");
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

// Approved + pending Floating Holiday requests for one employee in a year
const countFloatingRequests = async (employeeId, year, extraFilter = {}) =>
  Leave.countDocuments({
    employee: employeeId,
    leaveType: LEAVE_TYPES.FLOATING_HOLIDAY,
    status: { $in: ["pending", "approved"] },
    startDate: { $gte: `${year}-01-01`, $lte: `${year}-12-31` },
    ...extraFilter,
  });

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

    // Floating Holiday specific validation (server-side enforcement so the
    // 2-per-year limit cannot be bypassed via direct API calls)
    if (leaveType === LEAVE_TYPES.FLOATING_HOLIDAY) {
      if (startDate !== endDate) {
        return apiResponse.error(
          res,
          400,
          "A Floating Holiday request must be for a single day"
        );
      }

      const holiday = await Holiday.findOne({
        date: startDate,
        isActive: true,
        type: "floating",
      });
      if (!holiday) {
        return apiResponse.error(
          res,
          400,
          "The selected date is not an available Floating Holiday"
        );
      }

      const year = Number(startDate.split("-")[0]);
      const duplicate = await Leave.exists({
        employee: req.user._id,
        leaveType: LEAVE_TYPES.FLOATING_HOLIDAY,
        status: { $in: ["pending", "approved"] },
        startDate,
      });
      if (duplicate) {
        return apiResponse.error(
          res,
          409,
          "You have already applied for this Floating Holiday"
        );
      }

      const usedCount = await countFloatingRequests(req.user._id, year);
      if (usedCount >= LEAVE_ENTITLEMENTS.FLOATING_HOLIDAY) {
        return apiResponse.error(
          res,
          409,
          `You have used all ${LEAVE_ENTITLEMENTS.FLOATING_HOLIDAY} Floating Holidays for ${year}.`
        );
      }
    }

    const leave = await Leave.create({
      employee: req.user._id,
      leaveType: leaveType || "Casual",
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

    // Enforce the annual Floating Holiday limit at approval time (pending
    // requests may have been approved elsewhere in the meantime)
    if (
      status === "approved" &&
      leave.leaveType === LEAVE_TYPES.FLOATING_HOLIDAY &&
      leave.status !== "approved"
    ) {
      const year = Number(leave.startDate.split("-")[0]);
      const alreadyApproved = await Leave.countDocuments({
        employee: leave.employee,
        _id: { $ne: leave._id },
        leaveType: LEAVE_TYPES.FLOATING_HOLIDAY,
        status: "approved",
        startDate: { $gte: `${year}-01-01`, $lte: `${year}-12-31` },
      });
      if (alreadyApproved >= LEAVE_ENTITLEMENTS.FLOATING_HOLIDAY) {
        return apiResponse.error(
          res,
          409,
          `Cannot approve: the employee has already used all ${LEAVE_ENTITLEMENTS.FLOATING_HOLIDAY} Floating Holidays for ${year}.`
        );
      }
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

    const [approvedLeaves, pendingFloating] = await Promise.all([
      Leave.find({
        employee: req.user._id,
        status: "approved",
        startDate: { $gte: yearStart, $lte: yearEnd },
      }),
      Leave.countDocuments({
        employee: req.user._id,
        leaveType: LEAVE_TYPES.FLOATING_HOLIDAY,
        status: "pending",
        startDate: { $gte: yearStart, $lte: yearEnd },
      }),
    ]);

    // Used days per type, counting only the portion inside this calendar year
    const usedByType = {};
    for (const type of Object.keys(LEAVE_ENTITLEMENTS)) {
      usedByType[type] = 0;
    }
    for (const leave of approvedLeaves) {
      if (usedByType[leave.leaveType] === undefined) continue;
      usedByType[leave.leaveType] += countDaysInYear(
        leave.startDate,
        leave.endDate,
        year
      );
    }

    const buildSummary = (type) => {
      const entitlement = LEAVE_ENTITLEMENTS[type];
      const used = usedByType[type] ?? 0;
      return {
        entitlement,
        used,
        available: Math.max(entitlement - used, 0),
      };
    };

    const earnedLeave = buildSummary(LEAVE_TYPES.EARNED);
    const sickLeave = buildSummary(LEAVE_TYPES.SICK);
    const floatingHoliday = {
      ...buildSummary(LEAVE_TYPES.FLOATING_HOLIDAY),
      pending: pendingFloating,
    };

    return apiResponse.success(res, 200, "Leave balance fetched", {
      year,
      earnedLeave,
      sickLeave,
      floatingHoliday,
      totalUsed: earnedLeave.used + sickLeave.used + floatingHoliday.used,
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