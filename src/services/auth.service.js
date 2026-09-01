const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const { jwtSecret, jwtExpire } = require("../config/env");
const { createNotification } = require("./notification.service");

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, jwtSecret, { expiresIn: jwtExpire });
};

const registerUser = async (data) => {
  const { name, email, password, employeeId, role } = data;

  const emailExists = await User.findOne({ email });
  if (emailExists) {
    throw new AppError("This email is already registered", 400);
  }

  const idExists = await User.findOne({ employeeId });
  if (idExists) {
    throw new AppError("This Employee ID is already in use", 400);
  }

  const user = await User.create({
    ...data,
    role: role || "employee",
  });

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    employeeId: user.employeeId,
    role: user.role,
    token: generateToken(user._id, user.role),
  };
};

const loginUser = async ({ employeeId, password }) => {
  const user = await User.findOne({ employeeId }).select("+password");

  if (!user) {
    throw new AppError("Invalid Employee ID or password", 401);
  }

  if (!user.isActive) {
    throw new AppError("Your account has been deactivated. Contact admin.", 403);
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    throw new AppError("Invalid Employee ID or password", 401);
  }

  // Welcome notification on first login
  if (!user.welcomeNotificationSent) {
    user.welcomeNotificationSent = true;
    await user.save();

    await createNotification({
      recipient: user._id,
      title: "Welcome",
      message: "Welcome to Dynamic Pro Technology Solution.",
      type: "announcement",
      metadata: {
        relatedRoute: "/dashboard",
      },
    });
  }

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    employeeId: user.employeeId,
    role: user.role,
    department: user.department,
    designation: user.designation,
    profilePicture: user.profilePicture,
    token: generateToken(user._id, user.role),
  };
};

module.exports = { registerUser, loginUser };