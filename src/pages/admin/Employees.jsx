// src/pages/admin/Employees.jsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getEmployees, getClients, getTasks, updateTask, registerUser, updateClient, createTask } from "../../api";
import Layout from "../../components/layout/Layout";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";

export default function Employees() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [assignClientEmp, setAssignClientEmp] = useState(null);
  const [addTaskEmp, setAddTaskEmp] = useState(null);

  // Load employees list
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });

  // Load clients list to associate work
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: getClients,
  });

  // Load tasks list to associate work
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => getTasks(),
  });

  // Toggle task status mutation
  const toggleTask = useMutation({
    mutationFn: ({ id, status }) => updateTask(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const isLoading = employeesLoading || clientsLoading || tasksLoading;

  // Filter employees based on search query
  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(search.toLowerCase()) ||
    emp.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout title="Employees — Work Assignment">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Employees & Work Monitor</h1>
            <p className="text-xs text-gray-500 mt-1">
              Monitor tasks and services progress assigned to each firm employee.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search bar */}
            <div className="relative w-full md:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Add Employee Button (Admin Only) */}
            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add Employee
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <EmptyState title="No employees found" description="Try searching for another name or email." />
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredEmployees.map((emp) => {
              // Get clients assigned to this employee
              const empClients = clients.filter(
                (c) => c.assigned_employee?.id === emp.id
              );

              // Get direct tasks assigned to this employee
              const empTasks = tasks.filter((t) => t.assignee?.id === emp.id);

              // Calculate overall metrics for this employee's clients
              let totalServices = 0;
              let completedServices = 0;

              empClients.forEach((client) => {
                client.services.forEach((s) => {
                  totalServices++;
                  if (s.status === "completed" || s.status === "done") {
                    completedServices++;
                  }
                });
              });

              const overallProgress =
                totalServices > 0
                  ? Math.round((completedServices / totalServices) * 100)
                  : 0;

              return (
                <div
                  key={emp.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col gap-3"
                >
                  {/* Top: Employee Info Card */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-50 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-bold text-sm select-none">
                        {emp.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 text-sm">{emp.name}</h3>
                          <Badge status={emp.role === "admin" ? "active" : "dormant"} />
                          <span className="text-[10px] text-gray-400 capitalize bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full font-medium">
                            {emp.role}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{emp.email}</p>
                        {emp.phone && (
                          <p className="text-[10px] text-gray-400 mt-0.5">Phone: {emp.phone}</p>
                        )}
                      </div>
                    </div>

                    {/* Right side progress overview */}
                    <div className="w-full md:w-64">
                      <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1.5">
                        <span>Work Completed</span>
                        <span>{overallProgress}%</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-700"
                          style={{ width: `${overallProgress}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1 text-right">
                        {completedServices} of {totalServices} assigned services completed across {empClients.length} clients
                      </p>
                    </div>
                  </div>

                  {/* Bottom: List of Assigned Clients and direct tasks */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Column 1 & 2: Assigned Clients */}
                    <div className="lg:col-span-2">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[10px] font-bold text-indigo-950 uppercase tracking-wider">
                          Assigned Clients ({empClients.length})
                        </h4>
                        <button
                          onClick={() => setAssignClientEmp(emp)}
                          className="text-[10px] bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded transition-colors font-medium flex items-center gap-1"
                        >
                          + Assign Client
                        </button>
                      </div>

                      {empClients.length === 0 ? (
                        <div className="bg-gray-50 border border-gray-100 border-dashed rounded-lg p-4 text-center">
                          <p className="text-[11px] text-gray-400">No clients currently assigned to this employee.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {empClients.map((client) => {
                            const clientDone = client.services.filter(
                              (s) => s.status === "completed" || s.status === "done"
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
                                      <p className="text-[10px] text-gray-400">No services assigned.</p>
                                    ) : (
                                      client.services.map((s) => (
                                        <div
                                          key={s.id}
                                          className="flex items-center justify-between text-[10px] bg-white border border-gray-100 rounded-md px-2 py-0.5"
                                        >
                                          <span className="text-gray-700 font-medium">{s.service.name}</span>
                                          <Badge status={s.status === "completed" ? "done" : "pending"} />
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
                          Direct Tasks ({empTasks.length})
                        </h4>
                        <button
                          onClick={() => setAddTaskEmp(emp)}
                          className="text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-1 rounded transition-colors font-medium flex items-center gap-1"
                        >
                          + Add Task
                        </button>
                      </div>

                      {empTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <p className="text-[11px] text-gray-400">No direct tasks assigned.</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
                          {empTasks.map((task) => {
                            const isDone = task.status === "done";
                            return (
                              <div
                                key={task.id}
                                className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm hover:border-blue-100 transition-colors"
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const nextStatus = isDone ? "pending" : "done";
                                    toggleTask.mutate({ id: task.id, status: nextStatus });
                                  }}
                                  className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
                                    isDone
                                      ? "bg-green-500 border-green-500 text-white"
                                      : "border-gray-300 hover:border-blue-500"
                                  }`}
                                >
                                  {isDone && (
                                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-medium ${isDone ? "text-gray-400 line-through" : "text-gray-700"}`}>
                                    {task.title}
                                  </p>
                                  <p className="text-[9px] text-gray-400 mt-0.5">
                                    Client: {task.client?.business_name || "—"}
                                    {task.due_date && ` · Due: ${new Date(task.due_date).toLocaleDateString("en-IN")}`}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddEmployeeModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            qc.invalidateQueries({ queryKey: ["employees"] });
          }}
        />
      )}

      {assignClientEmp && (
        <AssignClientModal
          employee={assignClientEmp}
          allClients={clients}
          onClose={() => setAssignClientEmp(null)}
          onSuccess={() => {
            setAssignClientEmp(null);
            qc.invalidateQueries({ queryKey: ["clients"] });
            qc.invalidateQueries({ queryKey: ["employees"] });
          }}
        />
      )}

      {addTaskEmp && (
        <AddTaskModal
          employee={addTaskEmp}
          allClients={clients}
          onClose={() => setAddTaskEmp(null)}
          onSuccess={() => {
            setAddTaskEmp(null);
            qc.invalidateQueries({ queryKey: ["tasks"] });
            qc.invalidateQueries({ queryKey: ["employees"] });
          }}
        />
      )}
    </Layout>
  );
}

function AssignClientModal({ employee, allClients, onClose, onSuccess }) {
  const [selectedClient, setSelectedClient] = useState("");
  
  const availableClients = allClients.filter(c => c.assigned_employee?.id !== employee.id);

  const mutation = useMutation({
    mutationFn: () => updateClient(selectedClient, { assigned_employee_id: employee.id }),
    onSuccess,
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-900">Assign Client to {employee.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>
        <div className="p-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">Select Client</label>
          <select 
            value={selectedClient} 
            onChange={e => setSelectedClient(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Choose a Client --</option>
            {availableClients.map(c => (
              <option key={c.id} value={c.id}>
                {c.business_name} {c.assigned_employee ? `(from ${c.assigned_employee.name})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="text-xs text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50">Cancel</button>
          <button 
            onClick={() => mutation.mutate()} 
            disabled={!selectedClient || mutation.isPending}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Assigning..." : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddTaskModal({ employee, allClients, onClose, onSuccess }) {
  const [form, setForm] = useState({ title: "", client_id: "", due_date: "" });

  const mutation = useMutation({
    mutationFn: () =>
      createTask({
        title: form.title,
        client_id: parseInt(form.client_id),
        due_date: form.due_date || null,
        assigned_to: employee.id,
      }),
    onSuccess,
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-900">Add Task for {employee.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Task Title *</label>
            <input 
              value={form.title} 
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Follow up on documents"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Related Client *</label>
            <select 
              value={form.client_id} 
              onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Choose a Client --</option>
              {allClients.map(c => (
                <option key={c.id} value={c.id}>{c.business_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
            <input 
              type="date"
              value={form.due_date} 
              onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="text-xs text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50">Cancel</button>
          <button 
            onClick={() => mutation.mutate()} 
            disabled={!form.title || !form.client_id || mutation.isPending}
            className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Adding..." : "Add Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddEmployeeModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "employee",
  });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => registerUser(form),
    onSuccess,
    onError: (err) =>
      setError(err.response?.data?.detail || "Failed to add employee"),
  });

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm((p) => ({ ...p, password: pass }));
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Add New Employee</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-3">
          {error && (
            <div className="bg-red-50 text-red-700 text-xs rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Priyesh Patel"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email Address *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="e.g. priyesh@firm.com"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="e.g. 9876543210"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Role *</label>
            <select
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="employee">Employee</option>
              <option value="admin">Admin (CA)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Password *</label>
            <div className="flex gap-2">
              <input
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Password"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={generatePassword}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-medium"
              >
                Generate
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="text-sm text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!form.name || !form.email || !form.password || mutation.isPending}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? "Adding..." : "Add Employee"}
          </button>
        </div>
      </div>
    </div>
  );
}
