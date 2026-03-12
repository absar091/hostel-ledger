const path = require('path');
const logger = require('./logger');

// Cache for email templates
const templateCache = new Map();

// Helper function to load and process email templates asynchronously
const loadEmailTemplate = async (templateName, variables = {}) => {
  try {
    let template;

    // Check cache first
    if (templateCache.has(templateName)) {
      template = templateCache.get(templateName);
    } else {
      // Determine path based on where this file is located (in backend-server/utils)
      // The templates are in backend-server/email-templates
      const templatesDir = path.join(__dirname, '..', 'email-templates');
      const templatePath = path.join(templatesDir, `${templateName}.html`);

      // Use asynchronous file reading
      template = await fs.promises.readFile(templatePath, 'utf8');

      // Store in cache
      templateCache.set(templateName, template);
    }

    // Replace variables in template
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(regex, variables[key]);
    });

    return template;
  } catch (error) {
    logger.error('❌ Error loading template %s: %O', templateName, error);
    return null;
  }
};

module.exports = {
  loadEmailTemplate
};
