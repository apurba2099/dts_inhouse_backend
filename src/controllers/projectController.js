const Project = require("../models/Project");
const ProjectLog = require("../models/ProjectLog");
const User = require("../models/User");
const apiResponse = require("../utils/apiResponse");
const { createNotification } = require("../services/notification.service");

// Get all projects (Admin gets all, Employee gets only projects they belong to)
const getProjects = async (req, res) => {
  try {
    let filter = { isActive: true };
    if (req.user.role !== "admin") {
      filter.members = req.user._id;
    }

    const projects = await Project.find(filter)
      .populate("members", "name email employeeId department designation")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return apiResponse.success(res, 200, "Projects fetched successfully", projects);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Admin: Create a new Project
const createProject = async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;
    if (!name || !name.trim()) {
      return apiResponse.error(res, 400, "Project name is required");
    }

    const existing = await Project.findOne({ name: name.trim() });
    if (existing) {
      return apiResponse.error(res, 400, "A project with this name already exists");
    }

    const members = Array.isArray(memberIds) && memberIds.length > 0 ? memberIds : [req.user._id];

    const project = await Project.create({
      name: name.trim(),
      description: (description || "").trim(),
      members,
      createdBy: req.user._id,
    });

    // Notify assigned members
    for (const memberId of members) {
      if (String(memberId) !== String(req.user._id)) {
        await createNotification({
          recipient: memberId,
          sender: req.user._id,
          title: "Project Assignment",
          message: `You have been assigned to project "${project.name}".`,
          type: "project_assignment",
          metadata: {
            employeeId: memberId,
            relatedRoute: "/daily-log/project",
          },
        });
      }
    }

    const populated = await Project.findById(project._id).populate(
      "members",
      "name email employeeId department designation"
    );

    return apiResponse.success(res, 201, "Project created successfully", populated);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Admin: Update Project Details
const updateProject = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) {
      return apiResponse.error(res, 404, "Project not found");
    }

    if (name !== undefined) project.name = name.trim();
    if (description !== undefined) project.description = description.trim();
    if (isActive !== undefined) project.isActive = isActive;

    await project.save();
    return apiResponse.success(res, 200, "Project updated successfully", project);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Admin: Add member to project
const addProjectMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) {
      return apiResponse.error(res, 404, "Project not found");
    }

    const user = await User.findById(userId);
    if (!user) {
      return apiResponse.error(res, 404, "User not found");
    }

    if (!project.members.some((m) => String(m) === String(userId))) {
      project.members.push(userId);
      await project.save();

      await createNotification({
        recipient: userId,
        sender: req.user._id,
        title: "Project Assignment",
        message: `You have been assigned to project "${project.name}".`,
        type: "project_assignment",
        metadata: {
          employeeId: userId,
          relatedRoute: "/daily-log/project",
        },
      });
    }

    const populated = await Project.findById(project._id).populate(
      "members",
      "name email employeeId department designation"
    );
    return apiResponse.success(res, 200, "Member added to project", populated);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Admin: Remove member from project
const removeProjectMember = async (req, res) => {
  try {
    const { userId } = req.params;
    const project = await Project.findById(req.params.id);
    if (!project) {
      return apiResponse.error(res, 404, "Project not found");
    }

    project.members = project.members.filter((m) => String(m) !== String(userId));
    await project.save();

    const populated = await Project.findById(project._id).populate(
      "members",
      "name email employeeId department designation"
    );
    return apiResponse.success(res, 200, "Member removed from project", populated);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Get Project Logs (Admin or Assigned Project Member)
const getProjectLogs = async (req, res) => {
  try {
    const { id } = req.params; // project id
    const project = await Project.findById(id);
    if (!project) {
      return apiResponse.error(res, 404, "Project not found");
    }

    if (req.user.role !== "admin" && !project.members.some((m) => String(m) === String(req.user._id))) {
      return apiResponse.error(res, 403, "You are not assigned to this project");
    }

    const { date, employeeId, status } = req.query;
    const filter = { project: id };

    if (date) filter.date = date;
    if (status && status !== "All") filter.status = status;
    if (employeeId && employeeId !== "All") filter.employee = employeeId;

    const logs = await ProjectLog.find(filter)
      .populate("employee", "name email employeeId")
      .sort({ createdAt: 1 });

    return apiResponse.success(res, 200, "Project logs fetched successfully", logs);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Create a Project Log (Admin or Assigned Project Member)
const createProjectLog = async (req, res) => {
  try {
    const { id } = req.params; // project id
    const project = await Project.findById(id);
    if (!project) {
      return apiResponse.error(res, 404, "Project not found");
    }

    if (req.user.role !== "admin" && !project.members.some((m) => String(m) === String(req.user._id))) {
      return apiResponse.error(res, 403, "You are not assigned to this project");
    }

    const { description, actualHours, date, status, employeeId } = req.body;

    if (!description || !description.trim()) {
      return apiResponse.error(res, 400, "Description is required");
    }

    let targetEmployee = req.user;
    if (req.user.role === "admin" && employeeId) {
      const found = await User.findById(employeeId);
      if (found) targetEmployee = found;
    }

    const log = await ProjectLog.create({
      project: project._id,
      projectName: project.name,
      employee: targetEmployee._id,
      employeeName: targetEmployee.name,
      date: date || new Date().toISOString().split("T")[0],
      description: description.trim(),
      actualHours: Number(actualHours) || 1,
      status: status || "In Progress",
    });

    const populated = await ProjectLog.findById(log._id).populate(
      "employee",
      "name email employeeId"
    );

    return apiResponse.success(res, 201, "Project log created successfully", populated || log);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Update Project Log (Admin or Log Creator)
const updateProjectLog = async (req, res) => {
  try {
    const { logId } = req.params;
    const log = await ProjectLog.findById(logId);
    if (!log) {
      return apiResponse.error(res, 404, "Project log not found");
    }

    if (req.user.role !== "admin" && String(log.employee) !== String(req.user._id)) {
      return apiResponse.error(res, 403, "Not authorized to edit this log");
    }

    const { description, actualHours, status, date } = req.body;

    if (description !== undefined) log.description = description.trim();
    if (actualHours !== undefined) log.actualHours = Number(actualHours);
    if (status !== undefined) log.status = status;
    if (date !== undefined) log.date = date;

    await log.save();
    return apiResponse.success(res, 200, "Project log updated successfully", log);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Delete Project Log (Admin or Log Creator)
const deleteProjectLog = async (req, res) => {
  try {
    const { logId } = req.params;
    const log = await ProjectLog.findById(logId);
    if (!log) {
      return apiResponse.error(res, 404, "Project log not found");
    }

    if (req.user.role !== "admin" && String(log.employee) !== String(req.user._id)) {
      return apiResponse.error(res, 403, "Not authorized to delete this log");
    }

    await ProjectLog.findByIdAndDelete(logId);
    return apiResponse.success(res, 200, "Project log deleted successfully", null);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Admin: Delete Project
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return apiResponse.error(res, 404, "Project not found");
    }

    await Project.findByIdAndDelete(req.params.id);
    await ProjectLog.deleteMany({ project: req.params.id });

    return apiResponse.success(res, 200, "Project deleted successfully", null);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

module.exports = {
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
};
