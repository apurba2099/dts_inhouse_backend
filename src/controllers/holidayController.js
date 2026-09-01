const Holiday = require("../models/Holiday");
const apiResponse = require("../utils/apiResponse");
const { istTodayString } = require("../utils/istDate");

// Get holidays, optionally filtered by year and/or type: GET /api/holidays?year=2026&type=floating
const getHolidays = async (req, res) => {
  try {
    const { year, type } = req.query;
    const filter = { isActive: true };
    if (year) {
      const parsedYear = parseInt(year, 10);
      if (Number.isNaN(parsedYear)) {
        return apiResponse.error(res, 400, "year must be a valid number");
      }
      filter.year = parsedYear;
    }
    if (type && ["regular", "floating"].includes(type)) {
      filter.type = type;
    }

    const holidays = await Holiday.find(filter).sort({ date: 1 });
    return apiResponse.success(res, 200, "Holidays fetched", holidays);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

// Next N upcoming REGULAR holidays from today (IST): GET /api/holidays/upcoming?limit=5
// Floating holidays are excluded - they are opt-in per employee, not
// company-wide off days.
const getUpcomingHolidays = async (req, res) => {
  try {
    let limit = parseInt(req.query.limit, 10);
    if (Number.isNaN(limit)) limit = 5;
    limit = Math.min(Math.max(limit, 1), 50);

    const holidays = await Holiday.find({
      isActive: true,
      type: { $ne: "floating" },
      date: { $gte: istTodayString() },
    })
      .sort({ date: 1 })
      .limit(limit);

    return apiResponse.success(res, 200, "Upcoming holidays fetched", holidays);
  } catch (err) {
    return apiResponse.error(res, 500, err.message);
  }
};

module.exports = { getHolidays, getUpcomingHolidays };
