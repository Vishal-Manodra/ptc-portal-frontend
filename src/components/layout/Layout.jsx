// src/components/layout/Layout.jsx
// Wrapper component that adds the sidebar to any page.
// Usage: wrap your page content in <Layout title="Dashboard">...</Layout>

import React, { useState } from "react";
import Sidebar from "./Sidebar";

export default function Layout({ children, title }) {
  // Sync collapsed state with localStorage so it persists across page navigations
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Sidebar — fixed on the left */}
      <Sidebar isCollapsed={isCollapsed} />

      {/* Main content — pushed right by sidebar width (w-56 = 224px, w-16 = 64px) */}
      <div className={`${isCollapsed ? "ml-16" : "ml-56"} flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out`}>

        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-7 h-14
                           flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {/* Sidebar toggle button with premium hover and active effects */}
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <svg
                className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-sm font-semibold text-gray-900 transition-colors duration-200">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {new Date().toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric"
              })}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-7 transition-all duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}