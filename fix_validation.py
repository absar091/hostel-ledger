import re

with open('backend-server/server.js', 'r') as f:
    content = f.read()

# 1. /api/verification/request
if "typeof email !== 'string'" not in content.split("/api/verification/request")[1][:500]:
    content = content.replace("""    if (!email || !name || !type) {
      return res.status(400).json({ success: false, error: 'Missing required fields: email, name, type' });
    }

    // Generate 6-digit code""", """    if (!email || !name || !type) {
      return res.status(400).json({ success: false, error: 'Missing required fields: email, name, type' });
    }

    if (typeof email !== 'string' || typeof name !== 'string' || typeof type !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid input types' });
    }

    // Generate 6-digit code""", 1)

# 2. /api/verification/check
if "typeof email !== 'string'" not in content.split("/api/verification/check")[1][:500]:
    content = content.replace("""    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const docId = Buffer.from(email.toLowerCase()).toString('base64').replace(/[^a-zA-Z0-9]/g, '');""", """    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    if (typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid input type' });
    }

    const docId = Buffer.from(email.toLowerCase()).toString('base64').replace(/[^a-zA-Z0-9]/g, '');""", 1)

# 3. /api/get-valid-user-details
if "typeof username !== 'string'" not in content.split("/api/get-valid-user-details")[1][:500]:
    content = content.replace("""    if (!username) {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    // Sanitize username to prevent path traversal (allow only alphanumeric, dots and underscores)""", """    if (!username) {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    if (typeof username !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid input type' });
    }

    // Sanitize username to prevent path traversal (allow only alphanumeric, dots and underscores)""", 1)

# 4. /api/send-invitation
if "typeof inviteeUsername !== 'string'" not in content.split("/api/send-invitation")[1][:500]:
    content = content.replace("""    if (!groupId || !inviteeUsername) {
      return res.status(400).json({ success: false, error: 'Group ID and username are required' });
    }

    if (!isValidFirebaseId(groupId)) {""", """    if (!groupId || !inviteeUsername) {
      return res.status(400).json({ success: false, error: 'Group ID and username are required' });
    }

    if (typeof inviteeUsername !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid input type' });
    }

    if (!isValidFirebaseId(groupId)) {""", 1)

# 5. /api/send-temp-member-alert
if "typeof to !== 'string'" not in content.split("/api/send-temp-member-alert")[1][:500]:
    content = content.replace("""    // Validate inputs
    if (!to || !memberName || !groupName || !expiryDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, memberName, groupName, expiryDate'
      });
    }

    // Security: Only allow users to alert themselves""", """    // Validate inputs
    if (!to || !memberName || !groupName || !expiryDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, memberName, groupName, expiryDate'
      });
    }

    if (typeof to !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid input type' });
    }

    // Security: Only allow users to alert themselves""", 1)

# 6. /api/send-welcome
if "typeof email !== 'string'" not in content.split("/api/send-welcome")[1][:500]:
    content = content.replace("""    if (!email || !name) {
      return res.status(400).json({ success: false, error: 'Missing required fields: email, name' });
    }

    // Security: Only allow users to send welcome emails to themselves""", """    if (!email || !name) {
      return res.status(400).json({ success: false, error: 'Missing required fields: email, name' });
    }

    if (typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid input type' });
    }

    // Security: Only allow users to send welcome emails to themselves""", 1)

with open('backend-server/server.js', 'w') as f:
    f.write(content)
