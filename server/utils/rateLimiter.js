let limitedUntil = 0;

module.exports = {
  isLimited() {
    return Date.now() < limitedUntil;
  },
  getRemainingMs() {
    return Math.max(0, limitedUntil - Date.now());
  },
  trigger(seconds = 10) {
    const ms = Math.max(1000, Math.floor(seconds) * 1000);
    limitedUntil = Date.now() + ms;
    console.warn(`⚠️ Global rate limiter triggered for ${ms}ms`);
    return ms;
  },
  clear() {
    limitedUntil = 0;
  }
};
