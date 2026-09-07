const mongoose = require("mongoose");
const ProjectLog = require("../models/ProjectLog");
const Project = require("../models/Project");
const User = require("../models/User");
const apiResponse = require("../utils/apiResponse");

// Employee or Admin: Create a new Daily Log (stored in ProjectLog)
const createDailyLog = async (req, res) => {
  try {
    const {
      project,
      projectId,
      description,
      actualHours,
      startDate,
      dueDate,
      priority,
      status,
      department,
      employeeId,
      color,
      date,
    } = req.body;

    if (!description || !description.trim()) {
      return apiResponse.error(res, 400, "Description is required");
    }

    // Resolve target Project
    let targetProject = null;
    const targetProjId = projectId || (project && mongoose.Types.ObjectId.isValid(project) ? project : null);
    if (targetProjId) {
      targetProject = await Project.findById(targetProjId);
    }

    if (!targetProject && project && typeof project === "string") {
      targetProject = await Project.findOne({
        name: { $regex: new RegExp("^" + project.trim() + "$", "i") },
      });
    }

    if (!targetProject) {
      // Pick first active project or create one if none exists
      targetProject = await Project.findOne({ isActive: true });
      if (!targetProject) {
        targetProject = await Project.create({
          name: (project && project.trim()) || "General Project",
          description: "Default Project",
          members: [req.user._id],
          createdBy: req.user._id,
        });
      }
    }

    let targetEmployee = req.user;
    if (req.user.role === "admin" && employeeId) {
      const foundUser = await User.findById(employeeId);
      if (foundUser) {
        targetEmployee = foundUser;
      }
    }

    const logDate = date || startDate || new Date().toISOString().split("T")[0];

    const log = await ProjectLog.create({
      project: targetProject._id,
      employee: targetEmployee._id,
      color: color || "blue",
      description: description.trim(),
      actualHours: Number(actualHours) || 8,
      date: logDate,
      startDate: startDate || logDate,
      dueDate: dueDate || logDate,
      priority: priority || "High",
      status: status || "Complete",
      department: department || targetEmployee.department || "Engineering",
    });

    const populated = await ProjectLog.findById(log._id)
      .populate("employee", "name email employeeId department designation")
      .populate("project", "name description");

    const result = populated ? populated.toObject() : log.toObject();
    result.employeeName = result.employee?.name || "";
    result.projectName = result.project?.name || "";
    result.project = result.project?.name || "";

    return apiResponse.success(res, 201, "Daily log created successfully", result);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Get Daily Logs with filters (from single ProjectLog table)
const getDailyLogs = async (req, res) => {
  try {
    const { from, to, department, employeeId, employeeName, priority, status, search, projectId } =
      req.query;
    const filter = {};

    if (projectId && projectId !== "All") {
      filter.project = projectId;
    }

    if (department && department !== "All Departments") {
      filter.department = department;
    }

    if (employeeId && employeeId !== "All Employees") {
      filter.employee = employeeId;
    } else if (employeeName && employeeName !== "All Employees") {
      // Find matching users by name and filter by their ObjectIds
      const matchingUsers = await User.find({
        name: { $regex: new RegExp("^" + employeeName.trim() + "$", "i") },
      }).select("_id");
      const userIds = matchingUsers.map((u) => u._id);
      filter.employee = { $in: userIds };
    }

    if (priority && priority !== "All Priority") {
      filter.priority = priority;
    }

    if (status && status !== "All Status") {
      filter.status = status;
    }

    if (from && to) {
      filter.$or = [
        { startDate: { $gte: from, $lte: to } },
        { date: { $gte: from, $lte: to } },
      ];
    } else if (from) {
      filter.$or = [{ startDate: { $gte: from } }, { date: { $gte: from } }];
    } else if (to) {
      filter.$or = [{ startDate: { $lte: to } }, { date: { $lte: to } }];
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      // Find matching user and project IDs for search
      const [matchingEmployees, matchingProjects] = await Promise.all([
        User.find({
          $or: [{ name: regex }, { email: regex }, { employeeId: regex }],
        }).select("_id"),
        Project.find({ name: regex }).select("_id"),
      ]);

      const matchedEmpIds = matchingEmployees.map((e) => e._id);
      const matchedProjIds = matchingProjects.map((p) => p._id);

      const searchConditions = [
        { description: regex },
        { department: regex },
      ];

      if (matchedEmpIds.length > 0) {
        searchConditions.push({ employee: { $in: matchedEmpIds } });
      }
      if (matchedProjIds.length > 0) {
        searchConditions.push({ project: { $in: matchedProjIds } });
      }

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    const rawLogs = await ProjectLog.find(filter)
      .populate("employee", "name email employeeId department designation")
      .populate("project", "name description")
      .sort({ createdAt: -1 });

    // Ensure format matches frontend expectations
    const logs = rawLogs.map((logDoc) => {
      const l = logDoc.toObject();
      const empName = l.employee?.name || "";
      const projName = l.project?.name || "";
      return {
        ...l,
        employeeName: empName,
        projectName: projName,
        project: projName,
        startDate: l.startDate || l.date,
        dueDate: l.dueDate || l.date,
        priority: l.priority || "Medium",
      };
    });

    return apiResponse.success(res, 200, "Daily logs fetched successfully", logs);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Get current user's daily logs
const getMyDailyLogs = async (req, res) => {
  try {
    const rawLogs = await ProjectLog.find({ employee: req.user._id })
      .populate("employee", "name email employeeId department designation")
      .populate("project", "name description")
      .sort({ createdAt: -1 });

    const logs = rawLogs.map((logDoc) => {
      const l = logDoc.toObject();
      const empName = l.employee?.name || req.user.name || "";
      const projName = l.project?.name || "";
      return {
        ...l,
        employeeName: empName,
        projectName: projName,
        project: projName,
        startDate: l.startDate || l.date,
        dueDate: l.dueDate || l.date,
        priority: l.priority || "Medium",
      };
    });

    return apiResponse.success(res, 200, "My daily logs fetched successfully", logs);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Update a daily log
const updateDailyLog = async (req, res) => {
  try {
    const log = await ProjectLog.findById(req.params.id);
    if (!log) {
      return apiResponse.error(res, 404, "Daily log not found");
    }

    if (req.user.role !== "admin" && String(log.employee) !== String(req.user._id)) {
      return apiResponse.error(res, 403, "Not authorized to update this log");
    }

    const {
      project,
      projectId,
      description,
      actualHours,
      startDate,
      dueDate,
      priority,
      status,
      department,
      date,
    } = req.body;

    if (description !== undefined) log.description = description.trim();
    if (actualHours !== undefined) log.actualHours = Number(actualHours);
    if (startDate !== undefined) log.startDate = startDate;
    if (dueDate !== undefined) log.dueDate = dueDate;
    if (date !== undefined) log.date = date;
    if (priority !== undefined) log.priority = priority;
    if (status !== undefined) log.status = status;
    if (department !== undefined) log.department = department;

    if (projectId) {
      const foundProject = await Project.findById(projectId);
      if (foundProject) {
        log.project = foundProject._id;
      }
    } else if (project !== undefined) {
      const foundProject = await Project.findOne({
        name: { $regex: new RegExp("^" + project.trim() + "$", "i") },
      });
      if (foundProject) {
        log.project = foundProject._id;
      }
    }

    await log.save();

    const populated = await ProjectLog.findById(log._id)
      .populate("employee", "name email employeeId department designation")
      .populate("project", "name description");

    const result = populated ? populated.toObject() : log.toObject();
    result.employeeName = result.employee?.name || "";
    result.projectName = result.project?.name || "";
    result.project = result.project?.name || "";

    return apiResponse.success(res, 200, "Daily log updated successfully", result);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Delete a daily log
const deleteDailyLog = async (req, res) => {
  try {
    const log = await ProjectLog.findById(req.params.id);
    if (!log) {
      return apiResponse.error(res, 404, "Daily log not found");
    }

    if (req.user.role !== "admin" && String(log.employee) !== String(req.user._id)) {
      return apiResponse.error(res, 403, "Not authorized to delete this log");
    }

    await ProjectLog.findByIdAndDelete(req.params.id);
    return apiResponse.success(res, 200, "Daily log deleted successfully", null);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

module.exports = {
  createDailyLog,
  getDailyLogs,
  getMyDailyLogs,
  updateDailyLog,
  deleteDailyLog,
};
