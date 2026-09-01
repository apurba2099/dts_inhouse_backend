const express = require("express");
const router = express.Router();
const {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  getProjectLogs,
  createProjectLog,
  updateProjectLog,
  deleteProjectLog,
} = require("../controllers/projectController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.get("/", protect, getProjects);
router.post("/", protect, authorize("admin"), createProject);
router.put("/:id", protect, authorize("admin"), updateProject);
router.delete("/:id", protect, authorize("admin"), deleteProject);
router.post("/:id/members", protect, authorize("admin"), addProjectMember);
router.delete("/:id/members/:userId", protect, authorize("admin"), removeProjectMember);

router.get("/:id/logs", protect, getProjectLogs);
router.post("/:id/logs", protect, createProjectLog);
router.put("/logs/:logId", protect, updateProjectLog);
router.delete("/logs/:logId", protect, deleteProjectLog);

module.exports = router;
