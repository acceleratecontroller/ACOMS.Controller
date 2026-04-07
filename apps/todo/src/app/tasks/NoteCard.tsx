"use client";

export interface QuickNote {
  id: string;
  content: string;
  createdById: string;
  convertedToTaskId: string | null;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function formatNoteDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function NoteCard({
  note,
  isAdmin,
  onEdit,
  onArchive,
  onRestore,
  onConvertToTask,
}: {
  note: QuickNote;
  isAdmin: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onConvertToTask: () => void;
}) {
  const isConverted = !!note.convertedToTaskId;

  return (
    <div
      onClick={!note.isArchived ? onEdit : undefined}
      className={`bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-sm transition-all ${
        !note.isArchived ? "hover:shadow-md cursor-pointer hover:bg-amber-100/70" : "opacity-70"
      }`}
    >
      {/* Content preview */}
      <div className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-6 mb-3 min-h-[3rem]">
        {note.content || <span className="text-gray-400 italic">Empty note</span>}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-amber-200 pt-2">
        <span className="text-[11px] text-gray-400">
          {formatNoteDate(note.createdAt)}
        </span>

        <div className="flex items-center gap-1">
          {isConverted && (
            <span className="text-[10px] font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
              Converted to task
            </span>
          )}

          {isAdmin && !note.isArchived && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onConvertToTask(); }}
                className="p-1.5 rounded hover:bg-blue-100 text-blue-600 transition-colors"
                title="Create task from note"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onArchive(); }}
                className="p-1.5 rounded hover:bg-red-100 text-red-500 transition-colors"
                title="Archive note"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              </button>
            </>
          )}

          {isAdmin && note.isArchived && !isConverted && (
            <button
              onClick={(e) => { e.stopPropagation(); onRestore(); }}
              className="p-1.5 rounded hover:bg-green-100 text-green-600 transition-colors"
              title="Restore note"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
