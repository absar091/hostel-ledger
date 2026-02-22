const sanitizeHtml = require('sanitize-html');

/**
 * Sanitizes input to remove all HTML tags and attributes.
 * Returns safe plain text.
 * @param {any} input - The input string (or other type) to sanitize.
 * @returns {string} - The sanitized string.
 */
function sanitize(input) {
  if (input === null || input === undefined) return '';

  if (typeof input !== 'string') {
    // Reject objects/arrays to prevent injection/type confusion
    if (typeof input === 'object') return '';
    // Convert numbers/booleans to string
    input = String(input);
  }

  // Strip all tags and attributes
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard'
  }).trim();
}

module.exports = { sanitize };
