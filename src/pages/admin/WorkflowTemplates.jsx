import { useState } from "react";
import Layout from "../../components/layout/Layout";
import { createWorkflowTemplate, createWorkflowStep } from "../../api";

export default function WorkflowTemplates() {
  const [templateName, setTemplateName] = useState("");

  const [description, setDescription] = useState("");

  const [steps, setSteps] = useState([]);

  const [taskName, setTaskName] = useState("");

  const [role, setRole] = useState("employee");

  const [approvalRequired, setApprovalRequired] = useState(false);

  const addStep = () => {
    if (!taskName.trim()) return;

    setSteps([
      ...steps,
      {
        name: taskName,
        role,
        approvalRequired,
      },
    ]);

    setTaskName("");
    setRole("employee");
    setApprovalRequired(false);
  };

  const saveWorkflow = async () => {
    try {
      const template = await createWorkflowTemplate({
        name: templateName,
        description,
      });

      for (let i = 0; i < steps.length; i++) {
        await createWorkflowStep(template.id, {
          name: steps[i].name,
          sequence: i + 1,
          default_role: steps[i].role,
          approval_required: steps[i].approvalRequired,
        });
      }

      alert("Workflow Template Created");

      setTemplateName("");
      setDescription("");
      setSteps([]);
    } catch (err) {
      console.error(err);
      alert("Failed to create template");
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-xl font-bold mb-6">Workflow Builder</h1>

        <div className="bg-white p-6 rounded-xl shadow">
          <div className="space-y-3">
            <input
              className="w-full border p-3 rounded"
              placeholder="Workflow Name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />

            <textarea
              className="w-full border p-3 rounded"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow mt-6">
          <h2 className="text-xl font-bold mb-4">Add Task</h2>

          <div className="grid grid-cols-4 gap-4">
            <input
              className="border p-3 rounded"
              placeholder="Task Name"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
            />

            <select
              className="border p-3 rounded"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="employee">Employee</option>

              <option value="manager">Manager</option>

              <option value="admin">Admin</option>
            </select>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={approvalRequired}
                onChange={(e) => setApprovalRequired(e.target.checked)}
              />
              Approval Required
            </label>

            <button
              onClick={addStep}
              className="bg-blue-600 text-white rounded px-4"
            >
              Add Task
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow mt-6">
          <h2 className="text-xl font-bold mb-4">Workflow Steps</h2>

          {steps.map((step, index) => (
            <div key={index} className="border-b py-3">
              <div>
                <strong>{index + 1}.</strong> {step.name}
              </div>

              <div className="text-xs text-gray-500">Role: {step.role}</div>

              <div className="text-xs text-gray-500">
                Approval:
                {step.approvalRequired ? " Yes" : " No"}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={saveWorkflow}
          className="mt-6 bg-green-600 text-white px-6 py-3 rounded"
        >
          Save Workflow
        </button>
      </div>
    </Layout>
  );
}
