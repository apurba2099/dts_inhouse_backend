const express = require("express");
const router = express.Router();
const {
  createDailyLog,
  getDailyLogs,
  getMyDailyLogs,
  updateDailyLog,
  deleteDailyLog,
} = require("../controllers/dailyLogController");
const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, createDailyLog);
router.get("/", protect, getDailyLogs);
router.get("/my", protect, getMyDailyLogs);
router.put("/:id", protect, updateDailyLog);
router.delete("/:id", protect, deleteDailyLog);

module.exports = router;
