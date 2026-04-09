"use client";

import { useState, useRef, useEffect } from "react";

interface PeopleTagInputProps {
  value: string[];
  onChange: (people: string[]) => void;
  allPeople: string[];
  disabled?: boolean;
}

export function PeopleTagInput({ value, onChange, allPeople, disabled }: PeopleTagInputProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = input.trim()
    ? allPeople
        .filter(
          (p) =>
            p.toLowerCase().includes(input.toLowerCase()) &&
            !value.some((v) => v.toLowerCase() === p.toLowerCase()),
        )
        .slice(0, 8)
    : [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function addPerson(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    // Prevent duplicates (case-insensitive)
    if (value.some((v) => v.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...value, trimmed]);
    setInput("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  }

  function removePerson(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addPerson(input);
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      removePerson(value.length - 1);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`flex flex-wrap gap-1.5 p-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 min-h-[38px] ${
          disabled ? "opacity-60 pointer-events-none" : ""
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((person, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300"
          >
            {person}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removePerson(i);
                }}
                className="hover:text-blue-600 dark:hover:text-blue-200"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? "Type a name and press Enter..." : ""}
            className="flex-1 min-w-[120px] outline-none bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
          />
        )}
      </div>

      {/* Autocomplete suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-40 overflow-y-auto">
          {suggestions.map((person) => (
            <button
              key={person}
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/30"
              onClick={() => addPerson(person)}
            >
              {person}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
