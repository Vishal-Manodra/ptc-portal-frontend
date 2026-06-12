import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Layout from "../../components/layout/Layout";
import WorkflowTimeline from "../../components/workflows/WorkflowTimeline";
import {
  getWorkflowDashboard,
  getClientWorkflows,
  getMyTasks,
  getActivityLogs,
  deleteWorkflow,
  getPendingApprovals,
  approveWorkflowTask,
} from "../../api";

export default function Progress() {
  const queryClient = useQueryClient();
  const [editingWorkflowId, setEditingWorkflowId] = useState(null);
  const { data: dashboard } = useQuery({
    queryKey: ["workflow-dashboard"],
    queryFn: getWorkflowDashboard,
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ["client-workflows"],
    queryFn: getClientWorkflows,
  });

  const { data: myTasks = [] } = useQuery({
    queryKey: ["my-tasks"],
    queryFn: getMyTasks,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["activity-logs"],
    queryFn: getActivityLogs,
  });
  console.log("WORKFLOWS:", workflows);
  const groupedWorkflows = workflows.reduce((acc, workflow) => {
    const clientId = workflow.client_id;

    if (!acc[clientId]) {
      acc[clientId] = {
        clientName: workflow.client_name,
        workflows: [],
      };
    }

    acc[clientId].workflows.push(workflow);

    return acc;
  }, {});
  console.log("WORKFLOWS", workflows);
  console.log("GROUPED", groupedWorkflows);
  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: getPendingApprovals,
  });
  const handleEdit = (workflow) => {
    console.log("EDIT", workflow);
  };
  const handleDelete = async (workflowId) => {
    const confirmDelete = window.confirm("Delete this workflow?");

    if (!confirmDelete) return;

    try {
      await deleteWorkflow(workflowId);

      await queryClient.invalidateQueries({
        queryKey: ["client-workflows"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["workflow-dashboard"],
      });

      console.log("Deleted:", workflowId);
    } catch (err) {
      console.error(err);
    }
  };
  const handleApprove = async (taskId) => {
    try {
      await approveWorkflowTask(taskId);

      await queryClient.invalidateQueries({
        queryKey: ["pending-approvals"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["client-workflows"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["workflow-dashboard"],
      });
    } catch (err) {
      console.error(err);
    }
  };
  return (
    <Layout>
      <div className="px-3 py-0 pb-4 space-y-4">
        <h1 className="text-2xl font-bold mb-2">Progress Dashboard</h1>

        {/* Dashboard Stats */}

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="text-xs text-gray-500">Total Workflows</div>

            <div className="text-xl font-bold">
              {dashboard?.total_workflows ?? 0}
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="text-xs text-gray-500">Active Workflows</div>

            <div className="text-xl font-bold">
              {dashboard?.active_workflows ?? 0}
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="text-xs text-gray-500">Pending Tasks</div>

            <div className="text-xl font-bold">
              {dashboard?.pending_tasks ?? 0}
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="text-xs text-gray-500">Pending Approvals</div>

            <div className="text-xl font-bold">
              {dashboard?.pending_approvals ?? 0}
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <h2 className="font-bold mb-3">Pending Approvals</h2>

          {pendingApprovals.length === 0 ? (
            <p className="text-sm text-gray-500">No pending approvals</p>
          ) : (
            pendingApprovals.map((task) => (
              <div
                key={task.task_id}
                className="flex justify-between items-center border-b py-2"
              >
                <div>
                  <div className="font-medium">{task.client_name}</div>

                  <div className="text-xs text-gray-500">{task.step_name}</div>
                </div>

                <button
                  onClick={() => handleApprove(task.task_id)}
                  className="bg-green-600 text-white px-3 py-1 rounded text-xs"
                >
                  Approve
                </button>
              </div>
            ))
          )}
        </div>
        {/* Workflow Timelines */}

        <div className="space-y-3">
          {Object.entries(groupedWorkflows).map(([clientId, client]) => (
            <div
              key={clientId}
              className="bg-white rounded-lg border shadow-sm p-3"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">{client.clientName}</h2>

                <span className="text-xs text-gray-500">
                  {client.workflows.length} Workflow(s)
                </span>
              </div>

              <div className="space-y-2">
                {client.workflows.map((workflow) => (
                  <div
                    key={workflow.workflow_id}
                    className="border-l-2 border-blue-500 bg-gray-50 rounded-md px-3 py-2"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold">
                        {workflow.workflow_name}
                      </h3>

                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setEditingWorkflowId(
                              editingWorkflowId === workflow.workflow_id
                                ? null
                                : workflow.workflow_id,
                            )
                          }
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs"
                        >
                          {editingWorkflowId === workflow.workflow_id
                            ? "Done"
                            : "Edit"}
                        </button>

                        <button
                          onClick={() => handleDelete(workflow.workflow_id)}
                          className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <WorkflowTimeline
                      workflow={workflow}
                      isEditing={editingWorkflowId === workflow.workflow_id}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
