// Single source of truth for working-time summaries (weekly/monthly averages).
// Working time = checkOut - checkIn - total completed break duration.
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const Holiday = require("../models/Holiday");
const {
  pad2,
  istTodayString,
  weekdayOf,
  addDays,
} = require("../utils/istDate");

const minutesBetween = (startIso, endIso) =>
  Math.max(0, Math.round((new Date(endIso) - new Date(startIso)) / 60000));

// Only completed breaks count towards the deduction
const recordBreakMinutes = (record) =>
  record.breaks?.reduce(
    (sum, b) => (b.endTime ? sum + minutesBetween(b.startTime, b.endTime) : sum),
    0
  ) ?? 0;

// Monday of the week containing todayStr
const getWeekStart = (todayStr) => {
  const daysSinceMonday = (weekdayOf(todayStr) + 6) % 7;
  return addDays(todayStr, -daysSinceMonday);
};

// First and last "YYYY-MM-DD" of todayStr's month
const getMonthBounds = (todayStr) => {
  const [year, month] = todayStr.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start: `${year}-${pad2(month)}-01`, end: `${year}-${pad2(month)}-${pad2(lastDay)}` };
};

/**
 * Weekly + monthly average working time for one user.
 * Only valid completed workdays are averaged:
 *   - attendance record has both check-in AND check-out
 *   - not Sunday (off day)
 *   - not an active holiday
 *   - not covered by an approved leave
 *   - not in the future
 */
const getWorkSummary = async (userId) => {
  const todayStr = istTodayString();
  const weekStart = getWeekStart(todayStr);
  const weekEnd = addDays(weekStart, 6);
  const { start: monthStart, end: monthEnd } = getMonthBounds(todayStr);
  const rangeStart = weekStart < monthStart ? weekStart : monthStart;
  const rangeEnd = monthEnd > weekEnd ? monthEnd : weekEnd;

  const [records, leaves, holidays] = await Promise.all([
    Attendance.find({
      employee: userId,
      date: { $gte: rangeStart, $lte: rangeEnd },
      checkIn: { $ne: null },
      checkOut: { $ne: null },
    }).sort({ date: 1 }),
    Leave.find({
      employee: userId,
      status: "approved",
      startDate: { $lte: rangeEnd },
      endDate: { $gte: rangeStart },
    }),
    Holiday.find({
      isActive: true,
      // Floating holidays are opt-in (via approved leave) and must not be
      // excluded from working-time expectations for everyone
      type: { $ne: "floating" },
      date: { $gte: rangeStart, $lte: rangeEnd },
    }),
  ]);

  const holidayDates = new Set(holidays.map((h) => h.date));
  const isOnApprovedLeave = (dateStr) =>
    leaves.some((l) => l.startDate <= dateStr && l.endDate >= dateStr);

  // Keep only records that qualify as valid completed workdays
  const validRecords = records.filter(
    (r) =>
      r.date <= todayStr &&
      weekdayOf(r.date) !== 0 &&
      !holidayDates.has(r.date) &&
      !isOnApprovedLeave(r.date)
  );

  const summarizeRange = (from, to) => {
    let totalWorkingMinutes = 0;
    let completedWorkingDays = 0;

    for (const record of validRecords) {
      if (record.date >= from && record.date <= to) {
        const grossMinutes = minutesBetween(record.checkIn, record.checkOut);
        totalWorkingMinutes += Math.max(
          grossMinutes - recordBreakMinutes(record),
          0
        );
        completedWorkingDays += 1;
      }
    }

    return {
      totalWorkingMinutes,
      completedWorkingDays,
      // Zero valid workdays -> average of 0 (frontend renders "0h 00m")
      averageWorkingMinutes: completedWorkingDays
        ? Math.round(totalWorkingMinutes / completedWorkingDays)
        : 0,
    };
  };

  return {
    weekly: summarizeRange(weekStart, weekEnd),
    monthly: summarizeRange(monthStart, monthEnd),
    weekRange: { start: weekStart, end: weekEnd },
    monthRange: { start: monthStart, end: monthEnd },
    asOf: todayStr,
  };
};

module.exports = { getWorkSummary };
