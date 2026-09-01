const express = require("express");
const router = express.Router();
const {
  checkIn,
  checkOut,
  startBreak,
  endBreak,
  getToday,
  getMonth,
  getCalendar,
  getWorkSummaryForUser,
  getAllByDate,
} = require("../controllers/attendanceController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.post("/check-in", protect, checkIn);
router.post("/check-out", protect, checkOut);
router.post("/break/start", protect, startBreak);
router.post("/break/end", protect, endBreak);
router.get("/today", protect, getToday);
router.get("/month", protect, getMonth);
router.get("/calendar", protect, getCalendar);
router.get("/work-summary", protect, getWorkSummaryForUser);
router.get("/admin/day", protect, authorize("admin"), getAllByDate);

module.exports = router;