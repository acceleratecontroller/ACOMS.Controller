"use client";

import {
  Task,
  Assignee,
  STATUS_COLORS,
  PRIORITY_COLORS,
  PRIORITY_BADGE_COLORS,
  formatStatusLabel,
  formatDate,
  isOverdue,
  isDueToday,
  isDueSoon,
  assigneeName,
} from "./types";

function getTimelineStatus(task: Task): { text: string; color: string } {
  if (task.status === "COMPLETED") {
    return { text: "Completed", color: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" };
  }
  if (isOverdue(task.dueDate)) {
    return { text: "Overdue", color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" };
  }
  if (isDueToday(task.dueDate)) {
    return { text: "Due Today", color: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300" };
  }
  if (isDueSoon(task.dueDate)) {
    return { text: "Due Soon", color: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300" };
  }
  return { text: "On Track", color: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" };
}

export function TaskRow({
  task,
  assignees,
  isAdmin,
  onEdit,
  onComplete,
  onArchive,
  onRestore,
}: {
  task: Task;
  assignees: Assignee[];
  isAdmin: boolean;
  onEdit: () => void;
  onComplete: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const overdue = task.status !== "COMPLETED" && isOverdue(task.dueDate);
  const dueToday = task.status !== "COMPLETED" && isDueToday(task.dueDate);
  const completed = task.status === "COMPLETED";
  const timeline = getTimelineStatus(task);
  const assignee = assignees.find((a) => a.id === task.assigneeId);
  const ownerDisplay = assignee ? assigneeName(assignee) : task.assigneeId;

  const borderColor = PRIORITY_COLORS[task.priority] || "border-l-gray-300";

  return (
    <>
      {/* Desktop layout */}
      <div
        onClick={onEdit}
        className={`hidden md:flex items-center gap-3 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg mb-2 border-l-4 transition-all hover:shadow-sm cursor-pointer hover:bg-blue-50/60 dark:hover:bg-blue-900/20 ${borderColor} ${overdue ? "bg-red-50 dark:bg-red-900/30" : dueToday ? "bg-orange-50 dark:bg-orange-900/30" : "bg-white dark:bg-gray-800"} ${completed ? "opacity-60" : ""}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-semibold text-sm text-gray-900 dark:text-gray-100 ${completed ? "line-through" : ""}`}>
              {task.title}
            </span>
            {task.projectId && (
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                {task.projectId}
              </span>
            )}
          </div>
          {task.notes && (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-0.5 truncate max-w-md">{task.notes}</p>
          )}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 font-medium w-24 truncate">{ownerDisplay}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 w-16">{task.label}</div>
        <div className={`text-xs w-20 ${overdue ? "text-red-600 font-bold" : "text-gray-600 dark:text-gray-400"}`}>
          {formatDate(task.dueDate) || "No date"}
        </div>
        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full w-24 text-center ${timeline.color}`}>
          {timeline.text}
        </span>
        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full w-28 text-center ${STATUS_COLORS[task.status] || ""}`}>
          {formatStatusLabel(task.status)}
        </span>
        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full w-16 text-center ${PRIORITY_BADGE_COLORS[task.priority] || ""}`}>
          {task.priority}
        </span>
        {isAdmin && (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button onClick={onComplete} className="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 transition-colors" title={completed ? "Undo complete" : "Complete"}>
              {completed ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </button>
            {task.isArchived ? (
              <button onClick={onRestore} className="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 transition-colors" title="Restore">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
              </button>
            ) : (
              <button onClick={onArchive} className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors" title="Archive">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mobile layout */}
      <div
        onClick={onEdit}
        className={`md:hidden border border-gray-200 dark:border-gray-700 rounded-lg mb-2 border-l-4 px-3 py-2 transition-shadow cursor-pointer active:bg-blue-50 dark:active:bg-blue-900/20 hover:shadow-md ${borderColor} ${overdue ? "bg-red-50 dark:bg-red-900/30" : dueToday ? "bg-orange-50 dark:bg-orange-900/30" : "bg-white dark:bg-gray-800"} ${completed ? "opacity-60" : ""}`}
      >
        <div className="flex items-start justify-between mb-2">
          <span className={`font-semibold text-sm text-gray-900 dark:text-gray-100 flex-1 ${completed ? "line-through" : ""}`}>
            {task.title}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ml-2 ${timeline.color}`}>
            {timeline.text}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs mb-2">
          <div><span className="text-gray-400 dark:text-gray-500">Owner:</span> <span className="font-medium text-gray-700 dark:text-gray-300">{ownerDisplay}</span></div>
          <div><span className="text-gray-400 dark:text-gray-500">Due:</span> <span className={`font-medium ${overdue ? "text-red-600" : "text-gray-700 dark:text-gray-300"}`}>{formatDate(task.dueDate) || "None"}</span></div>
          {task.projectId && <div><span className="text-gray-400 dark:text-gray-500">Project:</span> <span className="font-medium text-gray-700 dark:text-gray-300">{task.projectId}</span></div>}
          <div><span className="text-gray-400 dark:text-gray-500">Progress:</span> <span className="font-medium text-gray-700 dark:text-gray-300">{formatStatusLabel(task.status)}</span></div>
        </div>
        {task.notes && <p className="text-xs text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-700/50 rounded p-2 mb-2">{task.notes}</p>}
      </div>
    </>
  );
}
