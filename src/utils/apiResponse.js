const success = (res, statusCode = 200, message = "Success", data = null) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

// Standard error response format
// Usage: apiResponse.error(res, 400, "Invalid email or password")

const error = (res, statusCode = 500, message = "Something went wrong") => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = { success, error };