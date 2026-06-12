import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { getEmployees, assignTask } from "../../api";

export default function WorkflowTimeline({ workflow, isEditing }) {
  console.log(workflow.workflow_name, workflow.tasks);
  const queryClient = useQueryClient();
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="font-bold text-xs">
          {workflow.progress_percent || 0}%
        </div>
      </div>

      <div className="flex items-start">
        {workflow.tasks?.map((task, index) => {
          const completed = task.status === "completed";
          const current = task.status === "in_progress";

          console.log(
            task.name,
            task.completed_at,
            new Date(task.completed_at),
          );

          return (
            <div key={task.task_id} className="flex-1">
              <div className="flex items-center">
                <div
                  className={`
                        w-2.5 h-2.5 rounded-full flex-shrink-0
                        ${
                          completed
                            ? "bg-green-500"
                            : current
                              ? "bg-orange-500"
                              : "bg-gray-300"
                        }
                    `}
                />

                {index < workflow.tasks.length - 1 && (
                  <div
                    className={`
                        flex-1 h-0.5
                        ${completed ? "bg-green-500" : "bg-gray-300"}
                        `}
                  />
                )}
              </div>

              <div className="mt-1 text-[10px]">
                <div className="font-medium">{task.name}</div>

                {/* Multiple Employees */}
                {isEditing ? (
                  <select
                    value={task.assigned_user_id || ""}
                    onChange={async (e) => {
                      try {
                        console.log(
                          "REASSIGN",
                          task.task_id,
                          "TO",
                          e.target.value,
                        );

                        const response = await assignTask(
                          task.task_id,
                          e.target.value,
                        );

                        console.log("API RESPONSE:", response);

                        await queryClient.invalidateQueries({
                          queryKey: ["client-workflows"],
                        });

                        await queryClient.refetchQueries({
                          queryKey: ["client-workflows"],
                        });

                        console.log("REFETCH DONE");
                      } catch (err) {
                        console.error("ASSIGN ERROR:", err);
                      }
                    }}
                    className="text-[9px] border rounded px-1"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-0.5">
                    <div className="text-gray-400 text-[9px]">
                      {task.assigned_user}
                    </div>

                    {task.transferred_to && (
                      <div className="text-gray-500 text-[8px] italic">
                        <div>Transferred from {task.original_assignee}</div>
                        <div>To {task.transferred_to}</div>
                      </div>
                    )}

                    {task.completed_at ? (
                      <>
                        <div className="text-[8px] text-gray-500">
                          {new Date(task.completed_at).toLocaleDateString(
                            "en-IN",
                            {
                              timeZone: "Asia/Kolkata",
                            },
                          )}
                        </div>

                        <div className="text-[8px] text-gray-500">
                          {new Date(task.completed_at).toLocaleTimeString(
                            "en-IN",
                            {
                              timeZone: "Asia/Kolkata",
                            },
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-[8px] text-gray-400">
                          --/--/----
                        </div>
                        <div className="text-[8px] text-gray-400">--:--</div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
