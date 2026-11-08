import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import GroupDetail from "./pages/GroupDetail";
import { AuthProvider } from "./contexts/AuthContext";
import { FirebaseDataProvider } from "./contexts/FirebaseDataContext";

const MockApp = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
           <div className="p-10 bg-gray-100 min-h-screen">
             <GroupDetail />
           </div>
        } />
      </Routes>
    </BrowserRouter>
  );
};

export default MockApp;