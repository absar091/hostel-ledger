const regex = /<Route path="\/secure-admin-dashboard" element={<AdminRoute><AdminDashboard \/><\/AdminRoute>} \/>/;
console.log(regex.test('    <Route path="/secure-admin-dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />'));
