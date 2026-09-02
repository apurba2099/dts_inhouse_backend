const DailyLog = require("../models/DailyLog");
const User = require("../models/User");
const apiResponse = require("../utils/apiResponse");

// Employee or Admin: Create a new Daily Log
const createDailyLog = async (req, res) => {
  try {
    const {
      project,
      description,
      actualHours,
      startDate,
      dueDate,
      priority,
      status,
      department,
      employeeId,
      color,
    } = req.body;

    if (!project || !description) {
      return apiResponse.error(res, 400, "Project and description are required");
    }

    let targetEmployee = req.user;
    if (req.user.role === "admin" && employeeId) {
      const foundUser = await User.findById(employeeId);
      if (foundUser) {
        targetEmployee = foundUser;
      }
    }

    const log = await DailyLog.create({
      employee: targetEmployee._id,
      employeeName: targetEmployee.name,
      color: color || "blue",
      project: project.trim(),
      description: description.trim(),
      actualHours: Number(actualHours) || 8,
      startDate: startDate || new Date().toISOString().split("T")[0],
      dueDate: dueDate || new Date().toISOString().split("T")[0],
      priority: priority || "High",
      status: status || "Complete",
      department: department || targetEmployee.department || "Engineering",
    });

    const populated = await DailyLog.findById(log._id).populate(
      "employee",
      "name email employeeId department designation"
    );

    return apiResponse.success(res, 201, "Daily log created successfully", populated || log);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Get Daily Logs with filters
const getDailyLogs = async (req, res) => {
  try {
    const { from, to, department, employeeId, priority, status, search } = req.query;
    const filter = {};

    if (department && department !== "All Departments") {
      filter.department = department;
    }

    if (employeeId && employeeId !== "All Employees") {
      filter.employee = employeeId;
    }

    if (priority && priority !== "All Priority") {
      filter.priority = priority;
    }

    if (status && status !== "All Status") {
      filter.status = status;
    }

    if (from && to) {
      filter.startDate = { $gte: from, $lte: to };
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { employeeName: regex },
        { project: regex },
        { description: regex },
        { department: regex },
      ];
    }

    const logs = await DailyLog.find(filter)
      .populate("employee", "name email employeeId department designation")
      .sort({ createdAt: 1 });

    return apiResponse.success(res, 200, "Daily logs fetched successfully", logs);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Get current user's daily logs
const getMyDailyLogs = async (req, res) => {
  try {
    const logs = await DailyLog.find({ employee: req.user._id }).sort({
      createdAt: 1,
    });
    return apiResponse.success(res, 200, "My daily logs fetched successfully", logs);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Update a daily log
const updateDailyLog = async (req, res) => {
  try {
    const log = await DailyLog.findById(req.params.id);
    if (!log) {
      return apiResponse.error(res, 404, "Daily log not found");
    }

    if (req.user.role !== "admin" && String(log.employee) !== String(req.user._id)) {
      return apiResponse.error(res, 403, "Not authorized to update this log");
    }

    const { employeeName, project, description, actualHours, startDate, dueDate, priority, status, department } =
      req.body;

    if (employeeName !== undefined) log.employeeName = employeeName;
    if (project !== undefined) log.project = project;
    if (description !== undefined) log.description = description;
    if (actualHours !== undefined) log.actualHours = Number(actualHours);
    if (startDate !== undefined) log.startDate = startDate;
    if (dueDate !== undefined) log.dueDate = dueDate;
    if (priority !== undefined) log.priority = priority;
    if (status !== undefined) log.status = status;
    if (department !== undefined) log.department = department;

    await log.save();
    return apiResponse.success(res, 200, "Daily log updated successfully", log);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Delete a daily log
const deleteDailyLog = async (req, res) => {
  try {
    const log = await DailyLog.findById(req.params.id);
    if (!log) {
      return apiResponse.error(res, 404, "Daily log not found");
    }

    if (req.user.role !== "admin" && String(log.employee) !== String(req.user._id)) {
      return apiResponse.error(res, 403, "Not authorized to delete this log");
    }

    await DailyLog.findByIdAndDelete(req.params.id);
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
