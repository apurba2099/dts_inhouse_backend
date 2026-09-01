const express = require("express");
const router = express.Router();
const {
  createRequest,
  getMyRequests,
  getAllRequests,
  updateRequestStatus,
} = require("../controllers/regularizationController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.post("/", protect, createRequest);
router.get("/my", protect, getMyRequests);
router.get("/all", protect, authorize("admin"), getAllRequests);
router.patch("/:id/status", protect, authorize("admin"), updateRequestStatus);

module.exports = router;