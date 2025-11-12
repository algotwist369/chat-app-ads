import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// Lazy load pages for code splitting
const Customer = lazy(() => import("./pages/Customer"));
const Chat = lazy(() => import("./pages/Chat"));
const Manager = lazy(() => import("./pages/Manager"));
const ManagerSignUp = lazy(() => import("./pages/ManagerSignUp"));
const ManagerSetting = lazy(() => import("./components/manager/ManagerSetting"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex h-screen items-center justify-center bg-[#0b141a]">
    <div className="flex flex-col items-center gap-4">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#25d366] border-t-transparent" />
      <p className="text-sm text-[#8696a0]">Loading...</p>
    </div>
  </div>
);

const App = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
