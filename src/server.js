require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const logger = require("./config/logger");

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/leave", require("./routes/leaveRoutes"));
app.use("/api/regularization", require("./routes/regularizationRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/holidays", require("./routes/holidayRoutes"));
app.use("/api/daily-logs", require("./routes/dailyLogRoutes"));
app.use("/api/projects", require("./routes/projectRoutes"));

// Test route
app.get("/", (req, res) => {
  res.send("HR System API is running...");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
