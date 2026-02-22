const sanitizeHtml = require('sanitize-html');

/**
 * Sanitizes input to remove all HTML tags and attributes.
 * Returns safe plain text.
 * @param {string} input - The input string to sanitize.
 * @returns {string} - The sanitized string.
 */
function sanitize(input) {
  if (typeof input !== 'string') return input;

  // Strip all tags and attributes
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard'
  }).trim();
}

module.exports = { sanitize };
