'use client';

import type { MedicineInfo } from '@/lib/api';

interface MedicineSearchSidebarProps {
  medicineName: string;
  onMedicineNameChange: (value: string) => void;
  onSearch: () => void;
  medicineLoading: boolean;
  medicineError: string;
  medicineResults: MedicineInfo[];
  expandedMedicine: string | null;
  onToggleExpand: (name: string | null) => void;
}

export default function MedicineSearchSidebar({
  medicineName,
  onMedicineNameChange,
  onSearch,
  medicineLoading,
  medicineError,
  medicineResults,
  expandedMedicine,
  onToggleExpand,
}: MedicineSearchSidebarProps) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">약 정보 검색</h3>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={medicineName}
          onChange={(e) => onMedicineNameChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          placeholder="약 이름"
          className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={onSearch}
          disabled={medicineLoading}
          className="px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium disabled:opacity-50"
        >
          검색
        </button>
      </div>
      {medicineError && <p className="text-xs text-red-500 mb-2">{medicineError}</p>}
      {medicineResults.length > 0 && (
        <ul className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
          {medicineResults.map((m) => (
            <li key={m.name}>
              <button
                type="button"
                onClick={() => onToggleExpand(expandedMedicine === m.name ? null : m.name)}
                className="w-full text-left py-2 text-sm hover:bg-gray-50 px-1 rounded"
              >
                <span className="font-medium text-gray-800">{m.name}</span>
                <span className="text-gray-400 text-xs ml-1">{m.company}</span>
              </button>
              {expandedMedicine === m.name && (
                <div className="pb-2 px-1 text-xs text-gray-500 space-y-1">
                  <p>분류: {m.category}</p>
                  <p>성분: {m.ingredients}</p>
                  {m.eeDocUrl && (
                    <a href={m.eeDocUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">
                      효능·효과 보기
                    </a>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
