'use client';

interface PostvisitPhaseTabsProps {
  phase: 'during' | 'after';
  isRecording: boolean;
  onPhaseChange: (phase: 'during' | 'after') => void;
}

export default function PostvisitPhaseTabs({
  phase,
  isRecording,
  onPhaseChange,
}: PostvisitPhaseTabsProps) {
  return (
    <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 max-w-xs">
      <button
        type="button"
        onClick={() => { if (!isRecording) onPhaseChange('during'); }}
        disabled={isRecording && phase !== 'during'}
        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
          phase === 'during'
            ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100'
            : 'text-gray-500 hover:text-gray-700'
        } disabled:text-gray-300 disabled:cursor-not-allowed`}
      >
        <span className="flex items-center justify-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <path d="M12 2a4 4 0 00-4 4v5a4 4 0 008 0V6a4 4 0 00-4-4z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          진료 중
          {isRecording && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
        </span>
      </button>
      <button
        type="button"
        onClick={() => { if (!isRecording) onPhaseChange('after'); }}
        disabled={isRecording}
        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
          phase === 'after'
            ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100'
            : 'text-gray-500 hover:text-gray-700'
        } disabled:text-gray-300 disabled:cursor-not-allowed`}
      >
        <span className="flex items-center justify-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <path d="M9 12h6M12 9v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          진료 후
        </span>
      </button>
    </div>
  );
}
