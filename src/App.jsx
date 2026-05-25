// src/App.jsx
// This file defines all the "pages" of the app and which URL shows which page.
// It also protects routes — if you're not logged in, you can't access /dashboard.
// If you're a client, you can't access the admin dashboard.

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/admin/Dashboard";
import ClientDetail from "./pages/admin/ClientDetail";
import Clients from "./pages/admin/Clients";
import Tasks from "./pages/admin/Tasks";
import Employees from "./pages/admin/Employees";
import MyWork from "./pages/admin/MyWork";
import GSTFiling from "./pages/admin/GSTFiling";
import ClientPortal from "./pages/client/ClientPortal";
import GSTLookup from "./pages/client/GSTLookup";

// QueryClient manages all API call caching
// staleTime: data stays fresh for 5 minutes before refetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

// ProtectedRoute — wraps any route that requires login
// If not logged in → redirect to /login
// If wrong role → redirect to correct area
function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to the right place based on their actual role
    if (user.role === "client") return <Navigate to="/portal" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// RootRedirect — when user visits "/" redirect based on their role
function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "client") return <Navigate to="/portal" replace />;
  return <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public route — no login needed */}
      <Route path="/login" element={<Login />} />

      {/* Root — redirects based on role */}
      <Route path="/" element={<RootRedirect />} />

      {/* Admin + Employee routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={["admin", "employee"]}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients"
        element={
          <ProtectedRoute allowedRoles={["admin", "employee"]}>
            <Clients />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients/:id"
        element={
          <ProtectedRoute allowedRoles={["admin", "employee"]}>
            <ClientDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute allowedRoles={["admin", "employee"]}>
            <Tasks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Employees />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-work"
        element={
          <ProtectedRoute allowedRoles={["employee"]}>
            <MyWork />
          </ProtectedRoute>
        }
      />
      <Route
        path="/gst"
        element={
          <ProtectedRoute allowedRoles={["admin", "employee"]}>
            <GSTLookup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/gst-filing"
        element={
          <ProtectedRoute allowedRoles={["admin", "employee"]}>
            <GSTFiling />
          </ProtectedRoute>
        }
      />

      {/* Client portal — only for clients */}
      <Route
        path="/portal"
        element={
          <ProtectedRoute allowedRoles={["client"]}>
            <ClientPortal />
          </ProtectedRoute>
        }
      />

      {/* Catch all — redirect to root */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
