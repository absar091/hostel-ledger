const fs = require('fs');
const path = 'backend-server/routes/adminRoutes.js';
let data = fs.readFileSync(path, 'utf8');

data = data.replace(
  "const { groupId } = req.params;\n    const groupData = await adminService.getGroupDetails(groupId);",
  "const groupId = req.params.groupId.trim();\n    const groupData = await adminService.getGroupDetails(groupId);"
);

data = data.replace(
  "const { groupId } = req.params;\n    const result = await adminService.deleteGroupForce(groupId);",
  "const groupId = req.params.groupId.trim();\n    const result = await adminService.deleteGroupForce(groupId);"
);

data = data.replace(
  "const { groupId, uid } = req.params;\n    const result = await adminService.removeGroupMemberForce(groupId, uid);",
  "const groupId = req.params.groupId.trim();\n    const uid = req.params.uid.trim();\n    const result = await adminService.removeGroupMemberForce(groupId, uid);"
);

fs.writeFileSync(path, data);
