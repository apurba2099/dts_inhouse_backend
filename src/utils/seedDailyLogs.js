require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Project = require("../models/Project");
const ProjectLog = require("../models/ProjectLog");
const { mongoUri } = require("../config/env");
const logger = require("../config/logger");

const seedData = async () => {
  try {
    await mongoose.connect(mongoUri);

    let admin = await User.findOne({ role: "admin" });
    if (!admin) {
      admin = await User.findOne({});
    }

    if (!admin) {
      logger.error("No users found in database. Run seed:admin first.");
      process.exit(1);
    }

    // 1. Seed Projects if none exist
    const projectCount = await Project.countDocuments();
    if (projectCount === 0) {
      const allUsers = await User.find({}).limit(5);
      const userIds = allUsers.map((u) => u._id);

      const p1 = await Project.create({
        name: "Website Redesign",
        description: "Company website overhaul and responsiveness improvement",
        members: userIds,
        createdBy: admin._id,
      });

      const p2 = await Project.create({
        name: "Mobile App Development",
        description: "iOS and Android client application",
        members: [admin._id],
        createdBy: admin._id,
      });

      const p3 = await Project.create({
        name: "HR System Portal",
        description: "Internal attendance and leave management suite",
        members: userIds,
        createdBy: admin._id,
      });

      logger.info("Projects seeded successfully.");

      // Seed sample project logs for Website Redesign
      const sampleProjectLogs = [
        {
          project: p1._id,
          employee: admin._id,
          date: "31-May-2025",
          description: "Created account flow wireframes and user journey mapping",
          actualHours: 3,
          status: "Complete",
        },
        {
          project: p1._id,
          employee: admin._id,
          date: "31-May-2025",
          description: "Designed homepage layout and hero section",
          actualHours: 2,
          status: "Complete",
        },
        {
          project: p1._id,
          employee: admin._id,
          date: "31-May-2025",
          description: "Developed responsive header and navigation menu",
          actualHours: 2.5,
          status: "In Progress",
        },
        {
          project: p1._id,
          employee: admin._id,
          date: "31-May-2025",
          description: "Integrated contact form with backend API",
          actualHours: 1.5,
          status: "Complete",
        },
        {
          project: p1._id,
          employee: admin._id,
          date: "31-May-2025",
          description: "Fixed mobile view alignment issues on services page",
          actualHours: 1,
          status: "In Progress",
        },
        {
          project: p1._id,
          employee: admin._id,
          date: "31-May-2025",
          description: "Optimized images and improved page load speed",
          actualHours: 1,
          status: "Complete",
        },
        {
          project: p1._id,
          employee: admin._id,
          date: "31-May-2025",
          description: "Tested form validation and error handling",
          actualHours: 1.5,
          status: "In Progress",
        },
        {
          project: p1._id,
          employee: admin._id,
          date: "31-May-2025",
          description: "Added meta tags and updated page SEO",
          actualHours: 1,
          status: "Yet to Start",
        },
        {
          project: p1._id,
          employee: admin._id,
          date: "31-May-2025",
          description: "Cross-browser testing and bug fixes",
          actualHours: 1,
          status: "Complete",
        },
        {
          project: p1._id,
          employee: admin._id,
          date: "31-May-2025",
          description: "Client review and feedback implementation",
          actualHours: 2,
          status: "Yet to Start",
        },
        {
          project: p1._id,
          employee: admin._id,
          date: "31-May-2025",
          description: "Final UI adjustments and responsiveness check",
          actualHours: 1.5,
          status: "In Progress",
        },
        {
          project: p1._id,
          employee: admin._id,
          date: "31-May-2025",
          description: "Project documentation and changelog update",
          actualHours: 1,
          status: "Yet to Start",
        },
      ];

      await ProjectLog.insertMany(sampleProjectLogs);
      logger.info("Project logs seeded successfully.");
    }

    // 2. Seed Daily Logs (into ProjectLog) if none exist
    const dailyLogCount = await ProjectLog.countDocuments({ project: { $ne: null } });
    // If only the project logs were seeded or no logs exist for other projects
    const existingLogCount = await ProjectLog.countDocuments();
    if (existingLogCount <= 12) {
      // Find or create projects corresponding to the daily log sample projects
      const projectNames = ["Yaarin", "recardo", "Abe", "Angela", "dts hr system"];
      const projectMap = {};
      for (const pName of projectNames) {
        let proj = await Project.findOne({ name: { $regex: new RegExp("^" + pName + "$", "i") } });
        if (!proj) {
          proj = await Project.create({
            name: pName,
            description: `${pName} Project`,
            members: [admin._id],
            createdBy: admin._id,
          });
        }
        projectMap[pName] = proj._id;
      }

      const sampleDailyLogs = [
        {
          project: projectMap["Yaarin"],
          employee: admin._id,
          color: "blue",
          actualHours: 5,
          description: "Agency account work - snapshots, creation account, Business csv handlel",
          date: "1-Aug-2026",
          startDate: "1-Aug-2026",
          dueDate: "1-Aug-2026",
          priority: "High",
          status: "Complete",
          department: "Engineering",
        },
        {
          project: projectMap["recardo"],
          employee: admin._id,
          color: "teal",
          actualHours: 8,
          description: "working on banner section design and sponser dashboard",
          date: "1-Aug-2026",
          startDate: "1-Aug-2026",
          dueDate: "1-Aug-2026",
          priority: "High",
          status: "Complete",
          department: "Design",
        },
        {
          project: projectMap["Abe"],
          employee: admin._id,
          color: "cyan",
          actualHours: 8,
          description:
            "Today I worked on updating the landing page as per the requirements that were shared with me, making sure everything matches what was discussed.",
          date: "1-Aug-2026",
          startDate: "1-Aug-2026",
          dueDate: "1-Aug-2026",
          priority: "High",
          status: "Complete",
          department: "Engineering",
        },
        {
          project: projectMap["Abe"],
          employee: admin._id,
          color: "indigo",
          actualHours: 5,
          description: "Secured Horizon - 01-08-2026.docx",
          date: "1-Aug-2026",
          startDate: "1-Aug-2026",
          dueDate: "1-Aug-2026",
          priority: "High",
          status: "Complete",
          department: "QA",
        },
        {
          project: projectMap["Abe"],
          employee: admin._id,
          color: "pink",
          actualHours: 4,
          description: "Feedback updated",
          date: "1-Aug-2026",
          startDate: "1-Aug-2026",
          dueDate: "1-Aug-2026",
          priority: "High",
          status: "Complete",
          department: "Engineering",
        },
        {
          project: projectMap["Angela"],
          employee: admin._id,
          color: "tealDark",
          actualHours: 9,
          description:
            "Stephen Terebeniec: Configured the Consultation No Show workflow and updated the new pipeline actions (disabled for review).\nJessica Kovacovich: Reviewed automations, identified missing workflows, and verified the email automation.\nEdward Vinson: Configured pipeline trigger automations (currently in Draft for review).",
          date: "3-Aug-2026",
          startDate: "3-Aug-2026",
          dueDate: "3-Aug-2026",
          priority: "High",
          status: "Complete",
          department: "Operations",
        },
        {
          project: projectMap["Abe"],
          employee: admin._id,
          color: "indigo",
          actualHours: 2,
          description: "Secured Horizon - 03/08/2026",
          date: "3-Aug-2026",
          startDate: "3-Aug-2026",
          dueDate: "3-Aug-2026",
          priority: "High",
          status: "Complete",
          department: "QA",
        },
        {
          project: projectMap["Abe"],
          employee: admin._id,
          color: "pink",
          actualHours: 6,
          description: "Feedback updated, video popup, new loan program",
          date: "3-Aug-2026",
          startDate: "3-Aug-2026",
          dueDate: "3-Aug-2026",
          priority: "High",
          status: "Complete",
          department: "Engineering",
        },
        {
          project: projectMap["recardo"],
          employee: admin._id,
          color: "teal",
          actualHours: 8,
          description: "working on sponser section opportunities section crud",
          date: "3-Aug-2026",
          startDate: "3-Aug-2026",
          dueDate: "3-Aug-2026",
          priority: "High",
          status: "Complete",
          department: "Design",
        },
        {
          project: projectMap["dts hr system"],
          employee: admin._id,
          color: "purple",
          actualHours: 8,
          description:
            "Added employee profile management — edit name, nickname, phone, biography, and profile picture (via ImageKit).",
          date: "3-Aug-2026",
          startDate: "3-Aug-2026",
          dueDate: "3-Aug-2026",
          priority: "High",
          status: "Complete",
          department: "Engineering",
        },
      ];

      await ProjectLog.insertMany(sampleDailyLogs);
      logger.info("Daily logs seeded into ProjectLog successfully.");
    }

    logger.info("Seeding finished successfully.");
    process.exit(0);
  } catch (error) {
    logger.error(`Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedData();
