const fs = require('fs');
const path = 'backend-server/services/adminService.js';
let data = fs.readFileSync(path, 'utf8');

const oldGetGroup = `  async getGroupDetails(groupId) {
    try {
      const groupSnapshot = await admin.database().ref(\`groups/\${groupId}\`).once('value');
      if (!groupSnapshot.exists()) {
        throw new Error('Group not found');
      }
      return groupSnapshot.val();
    } catch (error) {
      console.error(\`Error fetching group \${groupId}:\`, error);
      throw error;
    }
  }`;

const newGetGroup = `  async getGroupDetails(groupId) {
    try {
      const groupSnapshot = await admin.database().ref(\`groups/\${groupId}\`).once('value');
      if (!groupSnapshot.exists()) {
        // Fallback for personal spaces if they are only stored in userGroups
        if (groupId.startsWith('personal_')) {
           const uid = groupId.split('personal_')[1];
           const userGroupSnapshot = await admin.database().ref(\`userGroups/\${uid}/\${groupId}\`).once('value');
           if (userGroupSnapshot.exists()) {
              return userGroupSnapshot.val();
           }
        }
        throw new Error('Group not found');
      }
      return groupSnapshot.val();
    } catch (error) {
      console.error(\`Error fetching group \${groupId}:\`, error);
      throw error;
    }
  }`;

data = data.replace(oldGetGroup, newGetGroup);
fs.writeFileSync(path, data);
