require("dotenv").config();
const mongoose = require("mongoose");
const Project = require("../models/Project");
const ProjectLog = require("../models/ProjectLog");
const DailyLog = require("../models/DailyLog");
const { mongoUri } = require("../config/env");
const logger = require("../config/logger");

const cleanDemoData = async () => {
  try {
    await mongoose.connect(mongoUri);

    const deletedDaily = await DailyLog.deleteMany({});
    const deletedProjectLogs = await ProjectLog.deleteMany({});
    const deletedProjects = await Project.deleteMany({});

    logger.info(`Cleared ${deletedDaily.deletedCount} daily logs.`);
    logger.info(`Cleared ${deletedProjectLogs.deletedCount} project logs.`);
    logger.info(`Cleared ${deletedProjects.deletedCount} projects.`);
    logger.info("Demo data cleared successfully. System is now clean for manual testing.");

    process.exit(0);
  } catch (error) {
    logger.error(`Failed to clean demo data: ${error.message}`);
    process.exit(1);
  }
};

cleanDemoData();
