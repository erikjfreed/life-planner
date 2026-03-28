/**
 * Parse a date string "YYYY-MM-DD" into { year, month, day } without timezone issues.
 */
function parseDate(dateStr) {
  if (!dateStr) return { year: null, month: null, day: null };
  const [y, m, d] = dateStr.split('-').map(Number);
  return { year: y, month: m || 1, day: d || 1 };
}

/**
 * Format { year, month, day } or a date string to "YYYY-MM-DD".
 */
function formatDate(year, month, day) {
  return `${year}-${String(month || 1).padStart(2, '0')}-${String(day || 1).padStart(2, '0')}`;
}

/**
 * Get year from event date field.
 */
function eventYear(e) {
  return parseDate(e.date).year;
}

/**
 * Get month from event date field.
 */
function eventMonth(e) {
  return parseDate(e.date).month;
}

module.exports = { parseDate, formatDate, eventYear, eventMonth };
