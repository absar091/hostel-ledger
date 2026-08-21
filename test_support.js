const assert = require('assert');

let mockEmailSent = null;

const emailService = {
  isConnectionVerified: true,
  sendEmailSafe: async (options) => {
    mockEmailSent = options;
  }
}

async function run() {
  await emailService.sendEmailSafe({
    to: 'test@example.com',
    subject: 'Support Ticket Received: TKT-123456',
    html: `<p>Hello,</p><p>We have received your support request:</p><p><strong>Subject:</strong> Test subject</p><p>Our team will review this shortly.</p><p><strong>Ticket ID:</strong> TKT-123456</p>`
  });
  console.log("Email sent successfully:", mockEmailSent);
}

run();
