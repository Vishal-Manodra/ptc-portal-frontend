// src/components/layout/Sidebar.jsx
// The left navigation sidebar shown on all admin/employee pages.
// Highlights the current page and shows role-appropriate menu items.

import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// NavLink automatically adds "active" class when the route matches
// We use this to highlight the current page in the sidebar

const baseNavItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    roles: ["admin", "manager", "employee"],
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    label: "Clients",
    path: "/clients",
    roles: ["admin", "manager", "employee"],
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    label: "Progress",
    path: "/progress",
    roles: ["admin", "manager"],
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 17v-6m4 6V7m4 10V4M5 20h14"
        />
      </svg>
    ),
  },
  {
    label: "Employees",
    path: "/employees",
    roles: ["admin", "manager"],
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
  },
  {
    label: "Workflow Builder",
    path: "/workflow-templates",
    roles: ["admin", "manager"],
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    ),
  },
  {
    label: "My Work",
    path: "/my-work",
    roles: ["admin", "manager", "employee"],
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
  },
];

const serviceItems = [
  {
    label: "GST Filing",
    path: "/gst-filing",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    label: "ITR Filing",
    path: "/clients?service=itr",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    label: "Audit",
    path: "/clients?service=audit",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
  },
  {
    label: "ROC / MCA",
    path: "/clients?service=roc",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
    ),
  },
];

export default function Sidebar({ isCollapsed }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Get initials from name for the avatar
  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Filter nav items based on user role
  const navItems = baseNavItems.filter((item) =>
    item.roles.includes(user?.role),
  );

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200
                  flex flex-col z-20 transition-all duration-300 ease-in-out ${
                    isCollapsed ? "w-16" : "w-56"
                  }`}
    >
      {/* Logo */}
      <div
        className={`flex items-center ${
          isCollapsed ? "justify-center px-4" : "gap-3 px-5"
        } py-5 border-b border-gray-100 h-14 flex-shrink-0 transition-all duration-300`}
      >
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-105">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <span
          className={`font-semibold text-gray-900 text-sm truncate transition-all duration-300 ${
            isCollapsed
              ? "opacity-0 max-w-0 pointer-events-none"
              : "opacity-100 max-w-[150px]"
          }`}
        >
          PTC Portal
        </span>
      </div>

      {/* Main navigation */}
      <nav
        className={`flex-1 overflow-y-auto ${isCollapsed ? "px-1.5" : "px-3"} py-4 scrollbar-thin`}
      >
        <div className="space-y-0.5">
          <p
            className={`text-xs font-semibold text-gray-400 uppercase tracking-wider transition-all duration-300 truncate ${
              isCollapsed
                ? "opacity-0 h-0 overflow-hidden pb-0 mb-0"
                : "px-3 pb-2 mb-1"
            }`}
          >
            Main
          </p>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center ${
                  isCollapsed ? "justify-center px-0" : "gap-3 px-3"
                } py-2.5 rounded-lg text-sm transition-all duration-300 ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
              title={isCollapsed ? item.label : undefined}
            >
              <div className="flex-shrink-0 transition-transform duration-300 hover:scale-110">
                {item.icon}
              </div>
              <span
                className={`transition-all duration-300 truncate ${
                  isCollapsed
                    ? "opacity-0 max-w-0 pointer-events-none"
                    : "opacity-100 max-w-[150px]"
                }`}
              >
                {item.label}
              </span>
            </NavLink>
          ))}
        </div>

        {/* Services quick links */}
        <div className="mt-6 space-y-0.5">
          <p
            className={`text-xs font-semibold text-gray-400 uppercase tracking-wider transition-all duration-300 truncate ${
              isCollapsed
                ? "opacity-0 h-0 overflow-hidden pb-0 mb-0"
                : "px-3 pb-2 mb-1"
            }`}
          >
            Services
          </p>
          {serviceItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center ${
                isCollapsed ? "justify-center px-0" : "gap-3 px-3"
              } py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-300`}
              title={isCollapsed ? item.label : undefined}
            >
              <div className="flex-shrink-0 transition-transform duration-300 hover:scale-110">
                {item.icon}
              </div>
              <span
                className={`transition-all duration-300 truncate text-left ${
                  isCollapsed
                    ? "opacity-0 max-w-0 pointer-events-none"
                    : "opacity-100 max-w-[150px]"
                }`}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* WhatsApp status */}
        <div
          className={`mt-6 px-1 transition-all duration-300 ${isCollapsed ? "flex justify-center mt-4" : ""}`}
        >
          <div
            className={`transition-all duration-300 w-full ${
              isCollapsed
                ? "bg-transparent border-0 p-0 flex justify-center"
                : "px-3 py-3 bg-green-50/50 border border-green-100/80 rounded-xl"
            }`}
            title={
              isCollapsed
                ? "WhatsApp Bot Active: Clients can message documents"
                : undefined
            }
          >
            <div className="flex items-center gap-2 justify-center">
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              <span
                className={`text-xs font-semibold text-green-700 transition-all duration-300 truncate ${
                  isCollapsed
                    ? "opacity-0 max-w-0 pointer-events-none"
                    : "opacity-100 max-w-[150px]"
                }`}
              >
                WhatsApp Bot Active
              </span>
            </div>
            <p
              className={`text-[10px] text-green-600 mt-1 transition-all duration-300 truncate ${
                isCollapsed
                  ? "opacity-0 max-w-0 max-h-0 overflow-hidden mt-0"
                  : "opacity-100 max-w-[150px]"
              }`}
            >
              Clients can message documents
            </p>
          </div>
        </div>
      </nav>

      {/* User area at bottom */}
      <div
        className={`border-t border-gray-100 transition-all duration-300 flex-shrink-0 ${
          isCollapsed ? "p-1.5" : "p-3"
        }`}
      >
        <div
          className={`flex items-center ${
            isCollapsed
              ? "flex-col gap-3 justify-center py-2"
              : "gap-3 px-2 py-2"
          } transition-all duration-300 rounded-xl`}
        >
          {/* Avatar with initials */}
          <div
            className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center
                       text-blue-700 text-xs font-bold flex-shrink-0 transition-transform duration-300 hover:scale-105"
            title={isCollapsed ? `${user?.name} (${user?.role})` : undefined}
          >
            {initials}
          </div>
          <div
            className={`flex-1 min-w-0 transition-all duration-300 ${
              isCollapsed
                ? "opacity-0 max-w-0 max-h-0 overflow-hidden"
                : "opacity-100 max-w-[120px]"
            }`}
          >
            <p className="text-sm font-semibold text-gray-900 truncate leading-none mb-1">
              {user?.name}
            </p>
            <p className="text-[11px] text-gray-400 capitalize leading-none">
              {user?.role}
            </p>
          </div>
          {/* Logout button */}
          <button
            onClick={logout}
            title="Logout"
            className={`text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 p-1.5 rounded-lg flex-shrink-0`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
