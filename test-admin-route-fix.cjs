const fs = require('fs');
let data = fs.readFileSync('src/App.tsx', 'utf8');

if (data.includes('<Route path="/secure-admin-dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />')) {
  console.log("Using incorrect AdminRoute wrapper format");
} else {
  console.log("Format not found or already fixed");
}
