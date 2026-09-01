const jwt = require("jsonwebtoken");
const User = require("../models/User");
const apiResponse = require("../utils/apiResponse");
const { jwtSecret } = require("../config/env");

// Protect routes - check if user is logged in (valid token)
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, jwtSecret);

      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return apiResponse.error(res, 401, "User not found");
      }

      return next();
    } catch (error) {
      return apiResponse.error(res, 401, "Not authorized, token failed");
    }
  }

  if (!token) {
    return apiResponse.error(res, 401, "Not authorized, no token");
  }
};

// Restrict access based on role(s)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return apiResponse.error(
        res,
        403,
        `Access denied. Requires role: ${roles.join(" or ")}`
      );
    }
    next();
  };
};

module.exports = { protect, authorize };