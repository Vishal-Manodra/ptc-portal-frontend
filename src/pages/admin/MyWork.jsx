// src/pages/admin/MyWork.jsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  getClients,
  getMyTasks,
  completeWorkflowTask,
  transferTask,
  getEmployees,
  approveTransfer,
} from "../../api";
import Layout from "../../components/layout/Layout";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import { useAuth } from "../../context/AuthContext";

export default function MyWork() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth(); // currently logged in employee

  // Load clients list (backend already filters this for the employee)
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: getClients,
  });

  // Load tasks list (backend already filters this)
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["my-workflow-tasks"],
    queryFn: getMyTasks,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });

  // Toggle task status mutation
  const completeTaskMutation = useMutation({
    mutationFn: completeWorkflowTask,

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["my-workflow-tasks"],
      });

      qc.invalidateQueries({
        queryKey: ["client-workflows"],
      });

      qc.invalidateQueries({
        queryKey: ["workflow-dashboard"],
      });
    },
  });
  const transferTaskMutation = useMutation({
    mutationFn: ({ taskId, employeeId }) => transferTask(taskId, employeeId),

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["my-workflow-tasks"],
      });

      qc.invalidateQueries({
        queryKey: ["client-workflows"],
      });
    },
  });

  const approveTransferMutation = useMutation({
    mutationFn: approveTransfer,

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["my-workflow-tasks"],
      });

      qc.invalidateQueries({
        queryKey: ["client-workflows"],
      });

      qc.invalidateQueries({
        queryKey: ["workflow-dashboard"],
      });
    },
  });

  const isLoading = clientsLoading || tasksLoading;
  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    (task) => task.status === "completed" || task.status === "approved",
  ).length;
  // Calculate overall metrics
  let totalServices = 0;
  let completedServices = 0;

  clients.forEach((client) => {
    client.services.forEach((s) => {
      totalServices++;
      if (s.status === "completed" || s.status === "done") {
        completedServices++;
      }
    });
  });

  const overallProgress =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
  return (
    <Layout title="My Work">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Work Hub</h1>
          <p className="text-xs text-gray-500 mt-1">
            Track your assigned clients, service progress, and pending tasks.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
            {/* Top: Employee Info Card */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-50 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-bold text-sm select-none">
                  {user?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {user?.name}
                    </h3>
                    <Badge status="active" />
                    <span className="text-[10px] text-gray-400 capitalize bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full font-medium">
                      {user?.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
                </div>
              </div>

              {/* Right side progress overview */}
              <div className="w-full md:w-64">
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1.5">
                  <span>My Completion</span>
                  <span>{overallProgress}%</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-700"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1 text-right">
                  {tasks.length} assigned workflow task
                  {tasks.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Bottom: List of Assigned Clients and direct tasks */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Column 1 & 2: Assigned Clients */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-bold text-indigo-950 uppercase tracking-wider">
                    My Assigned Clients ({clients.length})
                  </h4>
                </div>

                {clients.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-100 border-dashed rounded-lg p-4 text-center">
                    <p className="text-[11px] text-gray-400">
                      No clients assigned to you yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {clients.map((client) => {
                      const clientDone = client.services.filter(
                        (s) => s.status === "completed" || s.status === "done",
                      ).length;
                      const clientTotal = client.services.length;
                      const clientProgress =
                        clientTotal > 0
                          ? Math.round((clientDone / clientTotal) * 100)
                          : 0;

                      return (
                        <div
                          key={client.id}
                          onClick={() => navigate(`/clients/${client.id}`)}
                          className="border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-blue-200 rounded-lg p-3 transition-all duration-200 cursor-pointer shadow-sm flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="font-semibold text-xs text-gray-900 line-clamp-1">
                                {client.business_name}
                              </h5>
                              <Badge status={client.status} />
                            </div>

                            {/* Services dynamic checklist */}
                            <div className="mt-2 space-y-1.5">
                              {client.services.length === 0 ? (
                                <p className="text-[10px] text-gray-400">
                                  No services assigned.
                                </p>
                              ) : (
                                client.services.map((s) => (
                                  <div
                                    key={s.id}
                                    className="flex items-center justify-between text-[10px] bg-white border border-gray-100 rounded-md px-2 py-0.5"
                                  >
                                    <span className="text-gray-700 font-medium">
                                      {s.service.name}
                                    </span>
                                    <Badge
                                      status={
                                        s.status === "completed"
                                          ? "done"
                                          : "pending"
                                      }
                                    />
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Progress bar inside client subcard */}
                          {client.services.length > 0 && (
                            <div className="mt-3 pt-2 border-t border-gray-100/70">
                              <div className="flex justify-between text-[9px] text-gray-500 mb-1">
                                <span>Client Progress</span>
                                <span>{clientProgress}%</span>
                              </div>
                              <div className="h-1.5 bg-gray-200/50 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600 rounded-full transition-all"
                                  style={{ width: `${clientProgress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Column 3: Direct Tasks Checklist */}
              <div className="bg-gray-50/50 border border-gray-100 rounded-xl p-3 shadow-inner flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-bold text-indigo-950 uppercase tracking-wider">
                    My Direct Tasks ({tasks.length})
                  </h4>
                </div>

                {tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <p className="text-[11px] text-gray-400">
                      No direct tasks assigned.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
                    {tasks.map((task) => (
                      <div
                        key={task.task_id}
                        className="bg-white border rounded-xl p-3"
                      >
                        <div className="font-semibold">{task.step_name}</div>
                        <div className="text-xs mt-1">{task.workflow_name}</div>
                        <div className="text-xs text-gray-500">
                          {task.client_name}
                        </div>

                        <div className="mt-3 flex items-center gap-3">
                          <button
                            onClick={() =>
                              completeTaskMutation.mutate(task.task_id)
                            }
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200
                            ${
                              task.status === "completed"
                                ? "bg-green-500 border-green-500 text-white"
                                : "bg-white border-gray-300 text-transparent hover:border-green-500"
                            }
                          `}
                          >
                            ✓
                          </button>

                          {task.status === "awaiting_approval" &&
                            task.original_assignee_id === user.id && (
                              <button
                                onClick={() =>
                                  approveTransferMutation.mutate(task.task_id)
                                }
                                className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
                              >
                                Approve
                              </button>
                            )}

                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (!e.target.value) return;

                              transferTaskMutation.mutate({
                                taskId: task.task_id,
                                employeeId: Number(e.target.value),
                              });
                            }}
                            className="border rounded px-2 py-1 text-xs"
                          >
                            <option value="">Transfer To</option>

                            {employees
                              .filter((emp) => {
                                if (user.role === "admin") return true;

                                if (user.role === "manager") {
                                  return (
                                    emp.role === "manager" ||
                                    emp.role === "employee"
                                  );
                                }

                                if (user.role === "employee") {
                                  return emp.role === "employee";
                                }

                                return false;
                              })
                              .map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.name} ({emp.role})
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
