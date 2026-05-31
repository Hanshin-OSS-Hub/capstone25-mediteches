'use client';

import { useState, type ReactNode } from 'react';

interface ConsentToggleProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
  children: ReactNode;
}

export default function ConsentToggle({
  id,
  label,
  checked,
  onChange,
  required = true,
  children,
}: ConsentToggleProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/50 overflow-hidden">
      <label
        htmlFor={id}
        className="flex items-start gap-3 cursor-pointer select-none p-4"
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-emerald-500 accent-emerald-500 focus:ring-emerald-400"
        />
        <span className="text-sm text-gray-700 leading-snug flex-1">
          <span className="font-medium">{label}</span>
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setExpanded(!expanded);
          }}
          className="shrink-0 text-xs text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
          aria-expanded={expanded}
        >
          {expanded ? '접기' : '보기'}
        </button>
      </label>
      {expanded && (
        <div className="mx-4 mb-4 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 text-xs leading-relaxed text-gray-600">
          {children}
        </div>
      )}
    </div>
  );
}
