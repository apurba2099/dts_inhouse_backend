const getTimestamp = () => new Date().toISOString();

const logger = {
  info: (...args) => {
    console.log(`[INFO] ${getTimestamp()} -`, ...args);
  },
  warn: (...args) => {
    console.warn(`[WARN] ${getTimestamp()} -`, ...args);
  },
  error: (...args) => {
    console.error(`[ERROR] ${getTimestamp()} -`, ...args);
  },
  debug: (...args) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEBUG] ${getTimestamp()} -`, ...args);
    }
  },
};

module.exports = logger;