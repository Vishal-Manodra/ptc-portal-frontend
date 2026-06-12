// src/pages/admin/Dashboard.jsx
// The main dashboard — first page admin/employee sees after login.
// Shows: summary metrics, client list with tabs, recent docs, pending tasks.

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getClients, getTasks, getMyTasks } from "../../api";
import Layout from "../../components/layout/Layout";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("all");

  // useQuery fetches data and caches it automatically
  // "clients" is the cache key — if another component also fetches clients,
  // it reuses this cached data instead of making another API call
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => getClients(),
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["my-workflow-tasks"],
    queryFn: getMyTasks,
  });

  // Filter clients based on active tab
  const filteredClients =
    activeTab === "all"
      ? clients
      : clients.filter((c) => c.status === activeTab);

  // Compute summary numbers
  const activeCount = clients.filter((c) => c.status === "active").length;
  const dormantCount = clients.filter((c) => c.status === "dormant").length;
  const overdueCount = tasks.filter((t) => t.status === "overdue").length;
  const pendingCount = tasks.filter((t) => t.status === "pending").length;

  return (
    <Layout title="Dashboard">
      {/* Metric cards row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard
          label={isAdmin ? "Total Firm Clients" : "My Assigned Clients"}
          value={clients.length}
        />
        <MetricCard label="Active" value={activeCount} color="text-blue-600" />
        <MetricCard
          label={isAdmin ? "Firm Pending Tasks" : "My Pending Tasks"}
          value={pendingCount + overdueCount}
          color={overdueCount > 0 ? "text-amber-600" : "text-gray-900"}
          sub={overdueCount > 0 ? `${overdueCount} overdue` : null}
        />
        <MetricCard
          label="Dormant"
          value={dormantCount}
          color="text-gray-400"
        />
      </div>

      {/* WhatsApp banner */}
      <div
        className="bg-green-50 border border-green-100 rounded-xl px-5 py-3
                      flex items-center gap-3 mb-6"
      >
        <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
        <div>
          <span className="text-sm font-medium text-green-800">
            WhatsApp Bot is active —
          </span>
          <span className="text-sm text-green-700 ml-1">
            clients can request documents via WhatsApp
          </span>
        </div>
      </div>

      {/* Client table */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        {/* Table header with tabs */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Clients</h2>
          <div className="flex items-center gap-3">
            {/* Tab switcher */}
            <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
              {[
                { key: "all", label: `All (${clients.length})` },
                { key: "active", label: `Active (${activeCount})` },
                { key: "dormant", label: `Dormant (${dormantCount})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTab === tab.key
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {isAdmin && (
              <button
                onClick={() => navigate("/clients")}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg
                           hover:bg-blue-700 transition-colors"
              >
                + Add Client
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {clientsLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : filteredClients.length === 0 ? (
          <EmptyState
            title="No clients found"
            subtitle="Add your first client to get started"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">
                    Client
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">
                    Services
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">
                    Assigned To
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">
                    Progress
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">
                    Status
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredClients.map((client) => (
                  <ClientRow
                    key={client.id}
                    client={client}
                    onClick={() => navigate(`/clients/${client.id}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom grid: tasks */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Pending Tasks</h2>
          <button
            onClick={() => navigate("/tasks")}
            className="text-xs text-blue-600 hover:underline"
          >
            View all
          </button>
        </div>
        {tasksLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState title="No tasks" subtitle="All clear!" />
        ) : (
          <div className="divide-y divide-gray-100">
            {tasks.slice(0, 5).map((task) => (
              <TaskRow key={task.task_id} task={task} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

// ── SUB-COMPONENTS ────────────────────────────────────────────────────────────

function MetricCard({ label, value, color = "text-gray-900", sub }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function ClientRow({ client, onClick }) {
  // Average progress across all services
  const avgProgress =
    client.services.length > 0
      ? Math.round(
        client.services.reduce((sum, s) => sum + s.progress, 0) /
        client.services.length,
      )
      : 0;

  const progressColor =
    avgProgress >= 75
      ? "bg-green-500"
      : avgProgress >= 40
        ? "bg-blue-500"
        : "bg-amber-500";

  return (
    <tr
      onClick={onClick}
      className="hover:bg-gray-50 cursor-pointer transition-colors"
    >
      {/* Client name + identifier */}
      <td className="px-5 py-3">
        <p className="text-sm font-medium text-gray-900">
          {client.business_name}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {client.gstin || client.pan || "—"}
        </p>
      </td>

      {/* Service badges */}
      <td className="px-5 py-3">
        <div className="flex flex-wrap gap-1">
          {client.services.slice(0, 3).map((cs) => (
            <span
              key={cs.id}
              className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full"
            >
              {cs.service.name.split(" ")[0]}
            </span>
          ))}
          {client.services.length > 3 && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
              +{client.services.length - 3}
            </span>
          )}
          {client.services.length === 0 && (
            <span className="text-xs text-gray-400">No services</span>
          )}
        </div>
      </td>

      {/* Assigned employee */}
      <td className="px-5 py-3">
        <span className="text-sm text-gray-600">
          {client.assigned_employee?.name || (
            <span className="text-gray-400">Unassigned</span>
          )}
        </span>
      </td>

      {/* Progress bar */}
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${progressColor}`}
              style={{ width: `${avgProgress}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{avgProgress}%</span>
        </div>
      </td>

      {/* Status badge */}
      <td className="px-5 py-3">
        <Badge status={client.status} />
      </td>

      {/* View button */}
      <td className="px-5 py-3">
        <button className="text-xs text-blue-600 hover:underline">View</button>
      </td>
    </tr>
  );
}

function TaskRow({ task }) {
  const dotColor =
    {
      overdue: "bg-red-500",
      pending: "bg-amber-500",
      done: "bg-green-500",
    }[task.status] || "bg-gray-400";

  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <span
        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900">{task.step_name}</p>
          {task.client && (
            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded font-medium">
              {task.client_name}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {task.due_date
            ? `Due ${new Date(task.due_date).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}`
            : "No due date"}
          {task.assignee && ` · ${task.assignee.name}`}
        </p>
      </div>
      <Badge status={task.status} />
    </div>
  );
}
