// Run once: node src/utils/seedAdmin.js
// Run once: node src/utils/seedHolidays.js
// Run once: node src/utils/seedDailyLogs.js

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const { mongoUri } = require("../config/env");
const logger = require("../config/logger");

const seedAdmin = async () => {
  try {
    await mongoose.connect(mongoUri);

    const existing = await User.findOne({ employeeId: "EMP-0001" });
    if (existing) {
      logger.info(`Admin user already exists: ${existing.employeeId}`);
      process.exit(0);
    }

    const admin = await User.create({
      name: "System Admin",
      email: "admin@orbithr.com",
      password: "Admin@123",
      employeeId: "EMP-0001",
      role: "admin",
      department: "Administration",
      designation: "HR Admin",
    });

    logger.info("Admin user created:");
    logger.info("  Employee ID: EMP-0001");
    logger.info("  Password:    Admin@123");
    logger.info("Please log in and change this password.");
    process.exit(0);
  } catch (error) {
    logger.error(`Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();