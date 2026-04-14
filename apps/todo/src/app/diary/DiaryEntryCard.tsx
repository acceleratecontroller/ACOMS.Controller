"use client";

import { useState } from "react";
import { DiaryEntry, formatDate, formatDateTime } from "./types";
import { DIARY_TYPE_COLORS } from "@/modules/diary/constants";

interface DiaryEntryCardProps {
  entry: DiaryEntry;
  onEdit: (entry: DiaryEntry) => void;
  onToggleImportant: (entry: DiaryEntry) => void;
  onArchive: (entry: DiaryEntry) => void;
}

export function DiaryEntryCard({ entry, onEdit, onToggleImportant, onArchive }: DiaryEntryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const colors = DIARY_TYPE_COLORS[entry.type] || DIARY_TYPE_COLORS.NOTE;

  const contentPreview =
    entry.content.length > 120
      ? entry.content.slice(0, 120) + "..."
      : entry.content;

  return (
    <div className="relative flex gap-3 md:gap-4 group">
      {/* Timeline dot */}
      <div className="flex flex-col items-center pt-1 shrink-0">
        <div className={`w-3 h-3 rounded-full ${colors.dot} ring-2 ring-white dark:ring-gray-900 z-10`} />
      </div>

      {/* Card */}
      <div className="flex-1 min-w-0 pb-6">
        <div
          className={`rounded-lg border transition-all ${
            entry.isImportant
              ? "border-red-300 dark:border-red-700 shadow-sm shadow-red-100 dark:shadow-red-900/20"
              : "border-gray-200 dark:border-gray-700"
          } bg-white dark:bg-gray-800`}
        >
          {/* Card header */}
          <div
            className="px-3 md:px-4 py-2.5 md:py-3 cursor-pointer select-none"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="flex items-start gap-2 justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Important red dot */}
                {entry.isImportant && (
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0" title="Important" />
                )}

                {/* Type badge */}
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] md:text-xs font-medium shrink-0 ${colors.bg} ${colors.text}`}
                >
                  {entry.type.charAt(0) + entry.type.slice(1).toLowerCase()}
                </span>

                {/* Heading */}
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {entry.heading}
                </h3>
              </div>

              {/* Date & Time */}
              <span className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 shrink-0 whitespace-nowrap">
                {formatDate(entry.date)}{entry.time ? ` ${entry.time}` : ""}
              </span>
            </div>

            {/* People tags */}
            {entry.people.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {entry.people.map((person, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  >
                    {person}
                  </span>
                ))}
              </div>
            )}

            {/* Content preview (when collapsed) */}
            {!expanded && entry.content && (
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                {contentPreview}
              </p>
            )}
          </div>

          {/* Expanded content */}
          {expanded && (
            <div className="border-t border-gray-100 dark:border-gray-700 px-3 md:px-4 py-3">
              {entry.content ? (
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                  {entry.content}
                </p>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">No content</p>
              )}

              {/* Metadata footer */}
              <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  Last modified: {formatDateTime(entry.updatedAt)}
                </span>
                <div className="flex items-center gap-1">
                  {/* Unlock / Lock toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUnlocked(!unlocked);
                    }}
                    className={`p-1.5 rounded transition-colors ${
                      unlocked
                        ? "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400"
                    }`}
                    title={unlocked ? "Lock" : "Unlock"}
                  >
                    {unlocked ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )}
                  </button>

                  {/* Actions only available when unlocked */}
                  {unlocked && (
                    <>
                      {/* Important toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleImportant(entry);
                        }}
                        className={`p-1.5 rounded transition-colors ${
                          entry.isImportant
                            ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-500"
                        }`}
                        title={entry.isImportant ? "Remove importance" : "Mark as important"}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                          <circle cx="8" cy="8" r="5" />
                        </svg>
                      </button>

                      {/* Edit */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(entry);
                        }}
                        className="p-1.5 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>

                      {/* Archive */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onArchive(entry);
                        }}
                        className="p-1.5 rounded text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Archive"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
