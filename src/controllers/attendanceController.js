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

// Get attendance for a given month or date range (supports employeeId for admin)
const getMonth = async (req, res) => {
  try {
    const { month, year, employeeId, range, startDate: queryStart, endDate: queryEnd } = req.query;

    const targetUserId = (req.user.role === "admin" && employeeId) ? employeeId : req.user._id;

    let startDate = queryStart;
    let endDate = queryEnd;

    if (!startDate || !endDate) {
      if (!month || !year) {
        return apiResponse.error(res, 400, "month and year, or startDate and endDate are required");
      }
      const parsedMonth = parseInt(month, 10);
      const parsedYear = parseInt(year, 10);
      const prefix = `${parsedYear}-${String(parsedMonth).padStart(2, "0")}`;
      startDate = `${prefix}-01`;
      const daysInMonth = new Date(parsedYear, parsedMonth, 0).getDate();
      endDate = `${prefix}-${String(daysInMonth).padStart(2, "0")}`;
    }

    const todayStr = getTodayDateString();

    const [attendanceRecords, leaves, holidays] = await Promise.all([
      Attendance.find({
        employee: targetUserId,
        date: { $gte: startDate, $lte: endDate },
      }).sort({ date: 1 }),
      Leave.find({
        employee: targetUserId,
        status: "approved",
        startDate: { $lte: endDate },
        endDate: { $gte: startDate },
      }).sort({ startDate: 1 }),
      Holiday.find({
        isActive: true,
        type: { $ne: "floating" },
        date: { $gte: startDate, $lte: endDate },
      }).sort({ date: 1 }),
    ]);

    // Build map for quick lookup
    const attendanceMap = new Map();
    attendanceRecords.forEach((rec) => {
      attendanceMap.set(rec.date, rec);
    });

    const holidayMap = new Map();
    holidays.forEach((h) => {
      holidayMap.set(h.date, h);
    });

    // Helper to check if date falls in approved leaves
    const getLeaveForDate = (dateStr) => {
      return leaves.find((l) => l.startDate <= dateStr && l.endDate >= dateStr);
    };

    // Iterate through all days in [startDate, endDate]
    const allRecords = [];
    let present = 0;
    let absent = 0;
    let leave = 0;
    let halfDay = 0;
    let workingDays = 0;

    const startD = new Date(`${startDate}T00:00:00`);
    const endD = new Date(`${endDate}T00:00:00`);

    for (let cur = new Date(startD); cur <= endD; cur.setDate(cur.getDate() + 1)) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, "0");
      const d = String(cur.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;

      const isSunday = cur.getDay() === 0;
      const isHoliday = holidayMap.has(dateStr);
      const isWorkDay = !isSunday && !isHoliday;

      if (isWorkDay) {
        workingDays += 1;
      }

      const att = attendanceMap.get(dateStr);
      const matchedLeave = getLeaveForDate(dateStr);

      let status = "";
      let checkIn = att ? att.checkIn : null;
      let checkOut = att ? att.checkOut : null;
      let breaks = att ? att.breaks : [];

      if (att) {
        const attStatus = String(att.status || "").toLowerCase();
        if (attStatus === "half day" || attStatus === "half-day") {
          status = "Half Day";
          halfDay += 1;
        } else {
          status = "Present";
          present += 1;
        }
      } else if (matchedLeave) {
        status = "Leave";
        leave += 1;
      } else if (isSunday) {
        status = "Weekend";
      } else if (isHoliday) {
        status = "Holiday";
      } else if (dateStr <= todayStr) {
        status = "Absent";
        absent += 1;
      } else {
        status = "Upcoming";
      }

      allRecords.push({
        _id: att ? att._id : `${targetUserId}-${dateStr}`,
        employee: targetUserId,
        date: dateStr,
        checkIn,
        checkOut,
        breaks,
        status,
      });
    }

    const attendancePercentage =
      workingDays > 0
        ? Math.min(100, Math.round(((present + halfDay * 0.5) / workingDays) * 100))
        : 0;

    const summary = {
      present,
      absent,
      leave,
      halfDay,
      workingDays,
      total: present + absent + leave + halfDay,
      attendancePercentage,
    };

    // If regular user or legacy call without employeeId/range, return simple array for backwards compatibility
    if (!employeeId && !range && !queryStart) {
      return apiResponse.success(res, 200, "Month attendance fetched", attendanceRecords);
    }

    return apiResponse.success(res, 200, "Month attendance fetched", {
      records: allRecords,
      rawAttendance: attendanceRecords,
      leaves,
      holidays,
      summary,
      workingDays,
    });
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Everything the attendance calendar needs for one month:
// attendance records + approved leaves overlapping the month + active holidays.
// All dates are "YYYY-MM-DD" strings, so range checks are safe string comparisons.
const getCalendar = async (req, res) => {
  try {
    const { month, year, employeeId } = req.query;
    const targetUserId = (req.user.role === "admin" && employeeId) ? employeeId : req.user._id;

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
        employee: targetUserId,
        date: { $regex: `^${prefix}` },
      }).sort({ date: 1 }),
      Leave.find({
        employee: targetUserId,
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