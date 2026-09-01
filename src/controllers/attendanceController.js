const User = require("../models/User");
const { sendBreakNotification } = require("../services/email.service");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const Holiday = require("../models/Holiday");
const apiResponse = require("../utils/apiResponse");
const { getWorkSummary } = require("../services/workSummary.service");

// const getTodayDateString = () => {
//   return new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
// };

const getTodayDateString = () => {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const istTime = new Date(now.getTime() + istOffsetMs);
  return istTime.toISOString().split("T")[0];
};

// Check in for today
const checkIn = async (req, res) => {
  try {
    const today = getTodayDateString();
    const existing = await Attendance.findOne({
      employee: req.user._id,
      date: today,
    });

    if (existing) {
      return apiResponse.error(res, 400, "Already checked in today");
    }

    const attendance = await Attendance.create({
      employee: req.user._id,
      date: today,
      checkIn: new Date(),
      status: "present",
    });

    return apiResponse.success(res, 201, "Checked in", attendance);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Check out for today
const checkOut = async (req, res) => {
  try {
    const attendance = await Attendance.findOne({
      employee: req.user._id,
      checkOut: null,
    }).sort({ createdAt: -1 });

    if (!attendance) {
      return apiResponse.error(res, 400, "You haven't checked in today");
    }
    if (attendance.checkOut) {
      return apiResponse.error(res, 400, "Already checked out today");
    }

    attendance.checkOut = new Date();
    attendance.status = "present";
    await attendance.save();

    return apiResponse.success(res, 200, "Checked out", attendance);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

const startBreak = async (req, res) => {
  try {
    const { reason, plannedEndTime } = req.body;
    if (!reason || !reason.trim()) {
      return apiResponse.error(res, 400, "Break reason is required");
    }

   const attendance = await Attendance.findOne({
      employee: req.user._id,
      checkOut: null,
    }).sort({ createdAt: -1 });

    if (!attendance) {
      return apiResponse.error(res, 400, "You haven't checked in today");
    }

    const hasOpenBreak = attendance.breaks.some((b) => !b.endTime);
    if (hasOpenBreak) {
      return apiResponse.error(res, 400, "You are already on a break");
    }

    attendance.breaks.push({
      startTime: new Date(),
      plannedEndTime: plannedEndTime ? new Date(plannedEndTime) : undefined,
      reason: reason.trim(),
    });
    attendance.status = "on-break";
    await attendance.save();

     // Notify everyone else (fire-and-forget, doesn't block the response)
    User.find({ _id: { $ne: req.user._id } })
      .select("email")
      .then((others) => {
        const emails = others.map((u) => u.email).filter(Boolean);
        sendBreakNotification(emails, {
          type: "start",
          employeeName: req.user.name,
          time: new Date().toLocaleTimeString(),
          reason: reason.trim(),
        });
      })
      .catch((err) => console.error("Failed to notify break start:", err.message));

    return apiResponse.success(res, 200, "Break started", attendance);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// End the current break
const endBreak = async (req, res) => {
  try {
    const attendance = await Attendance.findOne({
      employee: req.user._id,
      checkOut: null,
    }).sort({ createdAt: -1 });

    if (!attendance) {
      return apiResponse.error(res, 400, "You haven't checked in today");
    }

    const openBreak = attendance.breaks.find((b) => !b.endTime);
    if (!openBreak) {
      return apiResponse.error(res, 400, "You are not currently on a break");
    }

    openBreak.endTime = new Date();
    attendance.status = "present";
    await attendance.save();

    // Calculate how long the break lasted
    const durationMs = openBreak.endTime - openBreak.startTime;
    const durationMin = Math.round(durationMs / 60000);
    const durationText = `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`;

    // Notify everyone else (fire-and-forget, doesn't block the response)
    User.find({ _id: { $ne: req.user._id } })
      .select("email")
      .then((others) => {
        const emails = others.map((u) => u.email).filter(Boolean);
        sendBreakNotification(emails, {
          type: "end",
          employeeName: req.user.name,
          time: new Date().toLocaleTimeString(),
          duration: durationText,
        });
      })
      .catch((err) => console.error("Failed to notify break end:", err.message));

    return apiResponse.success(res, 200, "Break ended", attendance);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

//Get today's attendance for the logged-in user
const getToday = async (req, res) => {
  try {
    const attendance = await Attendance.findOne({
      employee: req.user._id,
      checkOut: null,
    }).sort({ createdAt: -1 });

    return apiResponse.success(res, 200, "Today's attendance fetched", attendance);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Get the logged-in user's attendance for a given month
const getMonth = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return apiResponse.error(res, 400, "month and year are required");
    }

    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    const records = await Attendance.find({
      employee: req.user._id,
      date: { $regex: `^${prefix}` },
    }).sort({ date: 1 });

    return apiResponse.success(res, 200, "Month attendance fetched", records);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Everything the attendance calendar needs for one month:
// attendance records + approved leaves overlapping the month + active holidays.
// All dates are "YYYY-MM-DD" strings, so range checks are safe string comparisons.
const getCalendar = async (req, res) => {
  try {
    const { month, year } = req.query;
    const parsedMonth = parseInt(month, 10);
    const parsedYear = parseInt(year, 10);
    if (
      !parsedMonth ||
      parsedMonth < 1 ||
      parsedMonth > 12 ||
      !parsedYear ||
      Number.isNaN(parsedYear)
    ) {
      return apiResponse.error(res, 400, "Valid month (1-12) and year are required");
    }

    const prefix = `${parsedYear}-${String(parsedMonth).padStart(2, "0")}`;
    const monthStart = `${prefix}-01`;
    const monthEnd = `${prefix}-31`; // lexicographic upper bound covers all months

    const [records, leaves, holidays] = await Promise.all([
      Attendance.find({
        employee: req.user._id,
        date: { $regex: `^${prefix}` },
      }).sort({ date: 1 }),
      Leave.find({
        employee: req.user._id,
        status: "approved",
        startDate: { $lte: monthEnd },
        endDate: { $gte: monthStart },
      }).sort({ startDate: 1 }),
      // Floating holidays are opt-in per employee - they must NOT appear as
      // global "Holiday" days. Approved floating leave still shows via the
      // leaves array above.
      Holiday.find({
        isActive: true,
        type: { $ne: "floating" },
        date: { $gte: monthStart, $lte: monthEnd },
      }).sort({ date: 1 }),
    ]);

    return apiResponse.success(res, 200, "Calendar data fetched", {
      year: parsedYear,
      month: parsedMonth,
      records,
      leaves,
      holidays,
    });
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Admin: get attendance status for all employees on a given date.
// Employees without an attendance record for the date are included as
// empty stubs (checkIn/checkOut null) so the team list is complete.
const getAllByDate = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || getTodayDateString();

    const [records, activeUsers] = await Promise.all([
      Attendance.find({ date: targetDate }).populate(
        "employee",
        "name employeeId email"
      ),
      User.find({ isActive: true }).select("name employeeId email"),
    ]);

    const recordedUserIds = new Set(
      records.map((r) => String(r.employee?._id || r.employee))
    );

    const stubs = activeUsers
      .filter((u) => !recordedUserIds.has(String(u._id)))
      .map((u) => ({
        _id: `no-record-${u._id}`,
        employee: {
          _id: u._id,
          name: u.name,
          employeeId: u.employeeId,
          email: u.email,
        },
        date: targetDate,
        checkIn: null,
        checkOut: null,
        breaks: [],
      }));

    return apiResponse.success(res, 200, "Team attendance fetched", [
      ...records,
      ...stubs,
    ]);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Weekly/monthly average working time for the logged-in user
const getWorkSummaryForUser = async (req, res) => {
  try {
    const summary = await getWorkSummary(req.user._id);
    return apiResponse.success(res, 200, "Work summary fetched", summary);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

module.exports = {
  checkIn,
  checkOut,
  startBreak,
  endBreak,
  getToday,
  getMonth,
  getCalendar,
  getWorkSummaryForUser,
  getAllByDate,
};