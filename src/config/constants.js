module.exports = {
  ROLES: {
    ADMIN: "admin",
    EMPLOYEE: "employee",
  },
  ATTENDANCE_STATUS: {
    PRESENT: "present",
    LATE: "late",
    HALF_DAY: "half-day",
    ABSENT: "absent",
  },
  LEAVE_STATUS: {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
  },
  LEAVE_TYPES: {
    CASUAL: "Casual",
    SICK: "Sick",
    EMERGENCY: "Emergency",
    EARNED: "Earned",
    FLOATING_HOLIDAY: "Floating Holiday",
  },
  // Annual leave entitlements per calendar year (days)
  LEAVE_ENTITLEMENTS: {
    EARNED: 7,
    SICK: 4,
    FLOATING_HOLIDAY: 2,
  },
};
