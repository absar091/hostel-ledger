const sanitizeHtml = require('sanitize-html');

/**
 * Sanitizes input to remove all HTML tags and attributes.
 * Returns safe plain text.
 * @param {string} input - The input string to sanitize.
 * @returns {string} - The sanitized string.
 */
function sanitize(input) {
  // Coerce numbers/booleans to string
  if (typeof input === 'number' || typeof input === 'boolean') {
    return String(input);
  }

  // Reject objects, arrays, null, undefined, or other non-strings
  if (typeof input !== 'string') {
    return '';
  }

  // Strip all tags and attributes
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard'
  }).trim();
}

module.exports = { sanitize };
