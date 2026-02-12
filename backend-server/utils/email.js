const fs = require('fs');
const path = require('path');

// Helper function to load and process email templates asynchronously
const loadEmailTemplate = async (templateName, variables = {}) => {
  try {
    // Determine path based on where this file is located (in backend-server/utils)
    // The templates are in backend-server/email-templates
    const templatesDir = path.join(__dirname, '..', 'email-templates');
    const templatePath = path.join(templatesDir, `${templateName}.html`);

    // Use asynchronous file reading
    let template = await fs.promises.readFile(templatePath, 'utf8');

    // Replace variables in template
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(regex, variables[key]);
    });

    return template;
  } catch (error) {
    console.error(`❌ Error loading template ${templateName}:`, error);
    return null;
  }
};

module.exports = {
  loadEmailTemplate
};
