const express = require("express");
const router = express.Router();
const { getHolidays, getUpcomingHolidays } = require("../controllers/holidayController");
const { protect } = require("../middleware/authMiddleware");

router.get("/upcoming", protect, getUpcomingHolidays);
router.get("/", protect, getHolidays);

module.exports = router;
