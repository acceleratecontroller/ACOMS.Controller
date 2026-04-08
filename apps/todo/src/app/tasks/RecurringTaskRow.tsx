"use client";

import {
  RecurringTask,
  Assignee,
  formatDate,
  isOverdue,
  isDueToday,
  isDueSoon,
  assigneeName,
  frequencyLabel,
} from "./types";

export function RecurringTaskRow({
  task,
  assignees,
  isAdmin,
  onEdit,
  onComplete,
  onArchive,
  onRestore,
}: {
  task: RecurringTask;
  assignees: Assignee[];
  isAdmin: boolean;
  onEdit: () => void;
  onComplete: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const overdue = isOverdue(task.nextDue);
  const dueToday = isDueToday(task.nextDue);
  const soon = isDueSoon(task.nextDue);
  const assignee = assignees.find((a) => a.id === task.assigneeId);
  const ownerDisplay = assignee ? assigneeName(assignee) : task.assigneeId;

  let statusText = "On Track";
  let statusColor = "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300";
  if (overdue) {
    const todayMs = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
    const [y, m, d] = task.nextDue!.substring(0, 10).split("-").map(Number);
    const dueMs = new Date(y, m - 1, d).getTime();
    const days = Math.floor((todayMs - dueMs) / (24 * 60 * 60 * 1000));
    statusText = `Overdue ${days}d`;
    statusColor = "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300";
  } else if (dueToday) {
    statusText = "Due Today";
    statusColor = "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300";
  } else if (soon) {
    statusText = "Due Soon";
    statusColor = "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300";
  }

  return (
    <>
      {/* Desktop */}
      <div
        onClick={onEdit}
        className={`hidden md:grid md:grid-cols-8 gap-2 px-4 py-3 items-center border-b last:border-b-0 transition-all cursor-pointer hover:bg-blue-50/60 dark:hover:bg-blue-900/20 ${
          overdue ? "bg-red-50 dark:bg-red-900/30 border-l-4 border-l-red-500" : dueToday ? "bg-orange-50 dark:bg-orange-900/30 border-l-4 border-l-orange-500" : soon ? "bg-yellow-50 dark:bg-yellow-900/20" : ""
        }`}
      >
        <div className="col-span-2">
          <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">{task.title}</div>
          {task.description && <p className="text-xs text-gray-500 dark:text-gray-400 italic truncate">{task.description}</p>}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400 font-medium truncate">{ownerDisplay}</div>
        <div className="text-xs text-gray-600 dark:text-gray-400">{frequencyLabel(task.frequencyType, task.frequencyValue)}</div>
        <div className="text-xs text-gray-600 dark:text-gray-400">{task.lastCompleted ? formatDate(task.lastCompleted) : "Never"}</div>
        <div className={`text-xs font-medium ${overdue ? "text-red-600 font-bold" : "text-gray-600 dark:text-gray-400"}`}>
          {task.nextDue ? formatDate(task.nextDue) : "Not set"}
        </div>
        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full text-center ${statusColor}`}>
          {statusText}
        </span>
        {isAdmin && (
          <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
            <button onClick={onComplete} className="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 transition-colors" title="Mark completed">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
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

      {/* Mobile */}
      <div
        onClick={onEdit}
        className={`md:hidden rounded-md border px-3 py-2 mb-1 transition-shadow cursor-pointer active:bg-blue-50 dark:active:bg-blue-900/20 hover:shadow-md ${
          overdue ? "bg-red-50 dark:bg-red-900/30 border-l-4 border-l-red-500" : dueToday ? "bg-orange-50 dark:bg-orange-900/30 border-l-4 border-l-orange-500" : soon ? "bg-yellow-50 dark:bg-yellow-900/20" : "bg-white dark:bg-gray-800"
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex-1">{task.title}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ml-2 ${statusColor}`}>
            {statusText}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs mb-2">
          <div><span className="text-gray-400 dark:text-gray-500">Owner:</span> <span className="font-medium text-gray-700 dark:text-gray-300">{ownerDisplay}</span></div>
          <div><span className="text-gray-400 dark:text-gray-500">Frequency:</span> <span className="font-medium text-gray-700 dark:text-gray-300">{frequencyLabel(task.frequencyType, task.frequencyValue)}</span></div>
          <div><span className="text-gray-400 dark:text-gray-500">Last Done:</span> <span className="font-medium text-gray-700 dark:text-gray-300">{task.lastCompleted ? formatDate(task.lastCompleted) : "Never"}</span></div>
          <div><span className="text-gray-400 dark:text-gray-500">Next Due:</span> <span className={`font-medium ${overdue ? "text-red-600" : "text-gray-700 dark:text-gray-300"}`}>{task.nextDue ? formatDate(task.nextDue) : "Not set"}</span></div>
        </div>
        {task.description && <p className="text-xs text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-700/50 rounded p-2 mb-2">{task.description}</p>}
      </div>
    </>
  );
}
