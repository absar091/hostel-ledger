const fs = require('fs');
const path = 'src/App.tsx';
let data = fs.readFileSync(path, 'utf8');

data = data.replace('import React, { useState, useEffect } from "react";', 'import React, { useState, useEffect } from "react";\nimport MaintenanceScreen from "./components/MaintenanceScreen";\nimport BroadcastBanner from "./components/BroadcastBanner";\nimport { useFirebaseData } from "./contexts/FirebaseDataContext";');


const target = "const AppRoutes = () => (";
const newCode = `const AppRoutes = () => {
  const { user } = useFirebaseAuth();
  const { maintenanceMode } = useFirebaseData();

  if (maintenanceMode && user?.role !== 'admin' && user?.role !== 'superadmin') {
    return <MaintenanceScreen />;
  }

  return (
    <>
      <BroadcastBanner />`;
data = data.replace(target, newCode);
data = data.replace("</Routes>\n);", "</Routes>\n    </>\n  );\n};");

fs.writeFileSync(path, data);
