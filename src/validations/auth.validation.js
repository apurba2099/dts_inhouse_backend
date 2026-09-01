const validateRegister = (data) => {
  const errors = [];

  if (!data.name || data.name.trim().length < 2) {
    errors.push("Name must be at least 2 characters long");
  }

  if (!data.email || !/^\S+@\S+\.\S+$/.test(data.email)) {
    errors.push("A valid email is required");
  }

  if (!data.password || data.password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!data.employeeId || data.employeeId.trim().length === 0) {
    errors.push("Employee ID is required");
  }

  if (data.role && !["admin", "employee"].includes(data.role)) {
    errors.push("Role must be either 'admin' or 'employee'");
  }

  return errors; // empty array means no errors
};

const validateLogin = (data) => {
  const errors = [];

  if (!data.employeeId || data.employeeId.trim().length === 0) {
    errors.push("Employee ID is required");
  }

  if (!data.password) {
    errors.push("Password is required");
  }

  return errors;
};

module.exports = { validateRegister, validateLogin };