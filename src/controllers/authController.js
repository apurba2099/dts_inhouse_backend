const { validateRegister, validateLogin } = require("../validations/auth.validation");
const authService = require("../services/auth.service");
const apiResponse = require("../utils/apiResponse");
const AppError = require("../utils/AppError");
const User = require("../models/User");
const crypto = require("crypto");
const { sendPasswordResetEmail } = require("../services/email.service");
const bcrypt = require("bcryptjs");
const imagekit = require("../config/imagekit");

//Admin register a new user
const registerUser = async (req, res) => {
  try {
    const errors = validateRegister(req.body);
    if (errors.length > 0) {
      return apiResponse.error(res, 400, errors.join(", "));
    }

    const result = await authService.registerUser(req.body);
    return apiResponse.success(res, 201, "User registered successfully", result);
  } catch (err) {
    if (err instanceof AppError) {
      return apiResponse.error(res, err.statusCode, err.message);
    }
    return apiResponse.error(res, 500, err.message);
  }
};

//Login user & get token
const loginUser = async (req, res) => {
  try {
    const errors = validateLogin(req.body);
    if (errors.length > 0) {
      return apiResponse.error(res, 400, errors.join(", "));
    }

    const result = await authService.loginUser(req.body);
    return apiResponse.success(res, 200, "Login successful", result);
  } catch (err) {
    if (err instanceof AppError) {
      return apiResponse.error(res, err.statusCode, err.message);
    }
    return apiResponse.error(res, 500, err.message);
  }
};


// Get all employees
const getEmployees = async (req, res) => {
  try {
    const employees = await User.find().select("-password").sort({ createdAt: -1 });
    return apiResponse.success(res, 200, "Employees fetched successfully", employees);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};


// Request a password reset link
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return apiResponse.error(res, 400, "Email is required");
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always respond the same way, whether or not the email exists,
    // so people can't use this to check which emails are registered
    if (!user) {
      return apiResponse.success(
        res,
        200,
        "If that email exists, a reset link has been sent",
        null
      );
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save();

    // console.log("Password reset link:", resetLink);

    const resetLink = `${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password/${rawToken}`;

    try {
      await sendPasswordResetEmail(user.email, resetLink);
    } catch (emailError) {
      return apiResponse.error(res, 500, "Failed to send reset email. Please try again later.");
    }


    return apiResponse.success(
      res,
      200,
      "If that email exists, a reset link has been sent",
      null
    );
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Reset password using a valid token
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      return apiResponse.error(res, 400, "Password must be at least 8 characters");
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
      return apiResponse.error(res, 400, "Reset link is invalid or has expired");
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return apiResponse.success(res, 200, "Password reset successful", null);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    return apiResponse.success(res, 200, "Profile fetched", user);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Update own profile (name, phone, nickname)
const updateMyProfile = async (req, res) => {
  try {
    const { name, phone, nickname } = req.body;
    const user = await User.findById(req.user._id);

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;

    await user.save();
    return apiResponse.success(res, 200, "Profile updated", user);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

//  Upload/update profile picture
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return apiResponse.error(res, 400, "No image file provided");
    }

    const uploaded = await imagekit.upload({
      file: req.file.buffer.toString("base64"),
      fileName: `profile_${req.user._id}_${Date.now()}`,
      folder: "/dynamicpro-hr/profile-pictures",
    });

    const user = await User.findById(req.user._id);
    user.profilePicture = uploaded.url;
    await user.save();

    return apiResponse.success(res, 200, "Profile picture updated", { profilePicture: uploaded.url });
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Change own password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return apiResponse.error(res, 400, "Current and new password are required");
    }
    if (newPassword.length < 8) {
      return apiResponse.error(res, 400, "New password must be at least 8 characters");
    }

    const user = await User.findById(req.user._id).select("+password");
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return apiResponse.error(res, 400, "Current password is incorrect");
    }

    user.password = newPassword;
    await user.save();

    return apiResponse.success(res, 200, "Password changed successfully", null);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Admin: update an employee's role, department, or designation

const updateEmployee = async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    if (!employee) {
      return apiResponse.error(res, 404, "Employee not found");
    }

    const { password, _id, ...updates } = req.body;
    if (updates.role !== undefined && !["admin", "employee"].includes(updates.role)) {
      return apiResponse.error(res, 400, "Role must be 'admin' or 'employee'");
    }

    Object.assign(employee, updates);

    // Update password if a new non-empty password is provided
    if (password && typeof password === "string" && password.trim()) {
      if (password.trim().length < 8) {
        return apiResponse.error(res, 400, "Password must be at least 8 characters");
      }
      employee.password = password.trim();
    }

    await employee.save();
    return apiResponse.success(res, 200, "Employee updated successfully", employee);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

const uploadEmployeePicture = async (req, res) => {
  try {
    if (!req.file) {
      return apiResponse.error(res, 400, "No image file provided");
    }
    const employee = await User.findById(req.params.id);
    if (!employee) {
      return apiResponse.error(res, 404, "Employee not found");
    }

    const uploaded = await imagekit.upload({
      file: req.file.buffer.toString("base64"),
      fileName: `profile_${employee._id}_${Date.now()}`,
      folder: "/dynamicpro-hr/profile-pictures",
    });

    employee.profilePicture = uploaded.url;
    await employee.save();

    return apiResponse.success(res, 200, "Employee picture updated", { profilePicture: uploaded.url });
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

const uploadEmployeeAsset = async (req, res) => {
  try {
    if (!req.file) {
      return apiResponse.error(res, 400, "No file provided");
    }
    const employee = await User.findById(req.params.id);
    if (!employee) {
      return apiResponse.error(res, 404, "Employee not found");
    }

    const label = req.body.label || "Document";
    const rawName = req.file.originalname || "document.pdf";
    const cleanFileName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_");

    const uploaded = await imagekit.upload({
      file: req.file.buffer.toString("base64"),
      fileName: `asset_${employee._id}_${Date.now()}_${cleanFileName}`,
      folder: "/dynamicpro-hr/assets",
      useUniqueFileName: true,
    });

    const newAsset = {
      id: Date.now().toString(),
      label,
      name: rawName,
      url: uploaded.url,
      fileId: uploaded.fileId,
      uploadedAt: new Date(),
    };

    employee.assets = employee.assets || [];
    employee.assets.push(newAsset);
    await employee.save();

    return apiResponse.success(res, 200, "Asset uploaded successfully", newAsset);
  } catch (err) {
    console.error("Asset upload error:", err);
    return apiResponse.error(res, 500, err.message || "Failed to upload asset");
  }
};

module.exports = {
  registerUser,
  loginUser,
  getEmployees,
  forgotPassword,
  resetPassword,
  getMyProfile,
  updateMyProfile,
  uploadProfilePicture,
  changePassword,
  updateEmployee,
  uploadEmployeePicture,
  uploadEmployeeAsset,
};