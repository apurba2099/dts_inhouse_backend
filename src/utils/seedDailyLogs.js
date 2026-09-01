require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Project = require("../models/Project");
const ProjectLog = require("../models/ProjectLog");
const DailyLog = require("../models/DailyLog");
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
          projectName: p1.name,
          employee: admin._id,
          employeeName: admin.name,
          date: "31-May-2025",
          description: "Created account flow wireframes and user journey mapping",
          actualHours: 3,
          status: "Complete",
        },
        {
          project: p1._id,
          projectName: p1.name,
          employee: admin._id,
          employeeName: admin.name,
          date: "31-May-2025",
          description: "Designed homepage layout and hero section",
          actualHours: 2,
          status: "Complete",
        },
        {
          project: p1._id,
          projectName: p1.name,
          employee: admin._id,
          employeeName: admin.name,
          date: "31-May-2025",
          description: "Developed responsive header and navigation menu",
          actualHours: 2.5,
          status: "In Progress",
        },
        {
          project: p1._id,
          projectName: p1.name,
          employee: admin._id,
          employeeName: admin.name,
          date: "31-May-2025",
          description: "Integrated contact form with backend API",
          actualHours: 1.5,
          status: "Complete",
        },
        {
          project: p1._id,
          projectName: p1.name,
          employee: admin._id,
          employeeName: admin.name,
          date: "31-May-2025",
          description: "Fixed mobile view alignment issues on services page",
          actualHours: 1,
          status: "In Progress",
        },
        {
          project: p1._id,
          projectName: p1.name,
          employee: admin._id,
          employeeName: admin.name,
          date: "31-May-2025",
          description: "Optimized images and improved page load speed",
          actualHours: 1,
          status: "Complete",
        },
        {
          project: p1._id,
          projectName: p1.name,
          employee: admin._id,
          employeeName: admin.name,
          date: "31-May-2025",
          description: "Tested form validation and error handling",
          actualHours: 1.5,
          status: "In Progress",
        },
        {
          project: p1._id,
          projectName: p1.name,
          employee: admin._id,
          employeeName: admin.name,
          date: "31-May-2025",
          description: "Added meta tags and updated page SEO",
          actualHours: 1,
          status: "Yet to Start",
        },
        {
          project: p1._id,
          projectName: p1.name,
          employee: admin._id,
          employeeName: admin.name,
          date: "31-May-2025",
          description: "Cross-browser testing and bug fixes",
          actualHours: 1,
          status: "Complete",
        },
        {
          project: p1._id,
          projectName: p1.name,
          employee: admin._id,
          employeeName: admin.name,
          date: "31-May-2025",
          description: "Client review and feedback implementation",
          actualHours: 2,
          status: "Yet to Start",
        },
        {
          project: p1._id,
          projectName: p1.name,
          employee: admin._id,
          employeeName: admin.name,
          date: "31-May-2025",
          description: "Final UI adjustments and responsiveness check",
          actualHours: 1.5,
          status: "In Progress",
        },
        {
          project: p1._id,
          projectName: p1.name,
          employee: admin._id,
          employeeName: admin.name,
          date: "31-May-2025",
          description: "Project documentation and changelog update",
          actualHours: 1,
          status: "Yet to Start",
        },
      ];

      await ProjectLog.insertMany(sampleProjectLogs);
      logger.info("Project logs seeded successfully.");
    }

    // 2. Seed Daily Logs if none exist
    const dailyLogCount = await DailyLog.countDocuments();
    if (dailyLogCount === 0) {
      const sampleDailyLogs = [
        {
          employee: admin._id,
          employeeName: "Apurba Dutta",
          color: "blue",
          actualHours: 5,
          project: "Yaarin",
          description: "Agency account work - snapshots, creation account, Business csv handlel",
          startDate: "1-Aug-2026",
          dueDate: "1-Aug-2026",
          priority: "High",
          status: "Complete",
          department: "Engineering",
        },
        {
          employee: admin._id,
          employeeName: "Sayan De",
          color: "teal",
          actualHours: 8,
          project: "recardo",
          description: "working on banner section design and sponser dashboard",
          startDate: "1-Aug-2026",
          dueDate: "1-Aug-2026",
          priority: "High",
          status: "Complete",
          department: "Design",
        },
        {
          employee: admin._id,
          employeeName: "Purba Choudhury",
          color: "cyan",
          actualHours: 8,
          project: "Abe",
          description:
            "Today I worked on updating the landing page as per the requirements that were shared with me, making sure everything matches what was discussed.",
          startDate: "1-Aug-2026",
          dueDate: "1-Aug-2026",
          priority: "High",
          status: "Complete",
          department: "Engineering",
        },
        {
          employee: admin._id,
          employeeName: "Soham Goswami",
          color: "indigo",
          actualHours: 5,
          project: "Abe",
          description: "Secured Horizon - 01-08-2026.docx",
          isDocLink: true,
          startDate: "1-Aug-2026",
          dueDate: "1-Aug-2026",
          priority: "High",
          status: "Complete",
          department: "QA",
        },
        {
          employee: admin._id,
          employeeName: "Bijay Kar",
          color: "pink",
          actualHours: 4,
          project: "Abe",
          description: "Feedback updated",
          startDate: "1-Aug-2026",
          dueDate: "1-Aug-2026",
          priority: "High",
          status: "Complete",
          department: "Engineering",
        },
        {
          employee: admin._id,
          employeeName: "Tushar Saha",
          color: "tealDark",
          actualHours: 9,
          project: "Angela",
          description:
            "Stephen Terebeniec: Configured the Consultation No Show workflow and updated the new pipeline actions (disabled for review).\nJessica Kovacovich: Reviewed automations, identified missing workflows, and verified the email automation.\nEdward Vinson: Configured pipeline trigger automations (currently in Draft for review).",
          startDate: "3-Aug-2026",
          dueDate: "3-Aug-2026",
          priority: "High",
          status: "Complete",
          department: "Operations",
        },
        {
          employee: admin._id,
          employeeName: "Soham Goswami",
          color: "indigo",
          actualHours: 2,
          project: "Abe",
          description: "Secured Horizon - 03/08/2026",
          isDocLink: true,
          startDate: "3-Aug-2026",
          dueDate: "3-Aug-2026",
          priority: "High",
          status: "Complete",
          department: "QA",
        },
        {
          employee: admin._id,
          employeeName: "Bijay Kar",
          color: "pink",
          actualHours: 6,
          project: "Abe",
          description: "Feedback updated, video popup, new loan program",
          startDate: "3-Aug-2026",
          dueDate: "3-Aug-2026",
          priority: "High",
          status: "Complete",
          department: "Engineering",
        },
        {
          employee: admin._id,
          employeeName: "Sayan De",
          color: "teal",
          actualHours: 8,
          project: "recardo",
          description: "working on sponser section opportunities section crud",
          startDate: "3-Aug-2026",
          dueDate: "3-Aug-2026",
          priority: "High",
          status: "Complete",
          department: "Design",
        },
        {
          employee: admin._id,
          employeeName: "Abhrajyoti Patra",
          color: "purple",
          actualHours: 8,
          project: "dts hr system",
          description:
            "Added employee profile management — edit name, nickname, phone, biography, and profile picture (via ImageKit).",
          startDate: "3-Aug-2026",
          dueDate: "3-Aug-2026",
          priority: "High",
          status: "Complete",
          department: "Engineering",
        },
      ];

      await DailyLog.insertMany(sampleDailyLogs);
      logger.info("Daily logs seeded successfully.");
    }

    logger.info("Seeding finished successfully.");
    process.exit(0);
  } catch (error) {
    logger.error(`Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedData();
