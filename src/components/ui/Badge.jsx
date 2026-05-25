// Colored status badge — used for Active/Dormant, Pending/Done etc.
import React from "react";

export default function Badge({ status }) {
  const styles = {
    active:      "bg-green-100 text-green-700",
    dormant:     "bg-gray-100 text-gray-600",
    pending:     "bg-amber-100 text-amber-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed:   "bg-green-100 text-green-700",
    on_hold:     "bg-gray-100 text-gray-600",
    done:        "bg-green-100 text-green-700",
    overdue:     "bg-red-100 text-red-700",
  };

  const labels = {
    active:      "Active",
    dormant:     "Dormant",
    pending:     "Pending",
    in_progress: "In Progress",
    completed:   "Completed",
    on_hold:     "On Hold",
    done:        "Done",
    overdue:     "Overdue",
  };

  const style = styles[status] || "bg-gray-100 text-gray-600";
  const label = labels[status] || status;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}