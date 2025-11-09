import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Customer from "./pages/Customer";
import Chat from "./pages/Chat";
import Manager from "./pages/Manager";
import ManagerSignUp from "./pages/ManagerSignUp";
import ManagerSetting from "./components/manager/ManagerSetting";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/manager/login" replace />} />
        <Route path="/manager/login" element={<Manager />} />
        <Route path="/manager/sign-up" element={<ManagerSignUp />} />
        <Route
          path="/manager/settings"
          element={
            <ProtectedRoute>
              <ManagerSetting />
            </ProtectedRoute>
          }
        />
        <Route path="/customer/login" element={<Customer />} />
        <Route path="/:businessSlug/customer/login" element={<Customer />} />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/manager/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;