require("dotenv").config();
const mongoose = require("mongoose");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const colls = await db.listCollections().toArray();
    console.log("COLLECTIONS:", colls.map((c) => c.name).join(", "));
    const holidays = await db.collection("holidays").find({}).sort({ date: 1 }).toArray();
    console.log("HOLIDAY_COUNT:", holidays.length);
    for (const h of holidays) {
      console.log(JSON.stringify({ name: h.name, date: h.date, year: h.year, isActive: h.isActive }));
    }
    process.exit(0);
  } catch (e) {
    console.error("ERROR:", e.message);
    process.exit(1);
  }
})();
