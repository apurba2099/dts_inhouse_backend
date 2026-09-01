// Shared IST (UTC+5:30) date-only helpers.
// All functions work on "YYYY-MM-DD" strings and use UTC arithmetic internally,
// so results never shift due to the server's timezone.

const pad2 = (n) => String(n).padStart(2, "0");

// Current IST date as "YYYY-MM-DD"
const istTodayString = () => {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().split("T")[0];
};

// Weekday (0=Sun..6=Sat) of a "YYYY-MM-DD" string
const weekdayOf = (dateStr) => new Date(`${dateStr}T00:00:00Z`).getUTCDay();

// Add days (negative allowed) to a "YYYY-MM-DD" string
const addDays = (dateStr, days) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
};

module.exports = { pad2, istTodayString, weekdayOf, addDays };
