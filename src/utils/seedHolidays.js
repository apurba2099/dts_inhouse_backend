// Run once: npm run seed:holidays (or: node src/utils/seedHolidays.js)
// Idempotent - upserts each holiday by date, safe to re-run.
// Also migrates existing records: sets type to "regular"/"floating" correctly.
require("dotenv").config();
const mongoose = require("mongoose");
const Holiday = require("../models/Holiday");
const { mongoUri } = require("../config/env");
const logger = require("../config/logger");

// type "floating": opt-in holidays - employees may avail max 2 per year
// via approved leave requests. They are NOT company-wide off days.
const HOLIDAYS_2026 = [
  { name: "New Year's Day", date: "2026-01-01", type: "regular" },
  { name: "Republic Day", date: "2026-01-26", type: "regular" },
  { name: "Holi", date: "2026-03-04", type: "floating" },
  { name: "Id-ul-Fitr", date: "2026-03-21", type: "floating" },
  { name: "Good Friday", date: "2026-04-03", type: "floating" },
  { name: "Buddha Purnima / May Day", date: "2026-05-01", type: "regular" },
  { name: "Independence Day", date: "2026-08-15", type: "regular" },
  { name: "Eid-e-Milad", date: "2026-08-26", type: "floating" },
  { name: "Maha Shashthi", date: "2026-10-17", type: "floating" },
  { name: "Maha Ashtami", date: "2026-10-19", type: "regular" },
  { name: "Maha Navami", date: "2026-10-20", type: "regular" },
  { name: "Dussehra", date: "2026-10-21", type: "regular" },
  { name: "Diwali / Deepavali", date: "2026-11-09", type: "regular" },
  { name: "Christmas", date: "2026-12-25", type: "regular" },
];

const seedHolidays = async () => {
  try {
    await mongoose.connect(mongoUri);

    let created = 0;
    let updated = 0;

    for ( const holiday of HOLIDAYS_2026) {
      const result = await Holiday.updateOne(
        { date: holiday.date },
        {
          $set: {
            year: parseInt(holiday.date.split("-")[0], 10),
            type: holiday.type,
            isActive: true,
          },
          $setOnInsert: {
            name: holiday.name,
            date: holiday.date,
            description: "",
          },
        },
        { upsert: true }
      );
      if (result.upsertedCount > 0) created += 1;
      else updated += 1;
    }

    logger.info(
      `Holiday seeding complete. ${created} created, ${updated} already existed.`
    );
    process.exit(0);
  } catch (error) {
    logger.error(`Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedHolidays();
