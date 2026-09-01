const express = require("express");
const router = express.Router();
const {
  createLeave,
  getMyLeaves,
  getAllLeaves,
  updateLeaveStatus,
  getLeaveBalance,
} = require("../controllers/leaveController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.post("/", protect, createLeave);
router.get("/my", protect, getMyLeaves);
router.get("/balance", protect, getLeaveBalance);
router.get("/all", protect, authorize("admin"), getAllLeaves);
router.patch("/:id/status", protect, authorize("admin"), updateLeaveStatus);

module.exports = router;