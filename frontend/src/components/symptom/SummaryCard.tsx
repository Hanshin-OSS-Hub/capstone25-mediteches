'use client';

import type { SymptomRecord } from '@/types';

type SummaryVariant = 'user' | 'medical';

interface SummaryCardProps {
  symptom: SymptomRecord;
  variant?: SummaryVariant;
  onDelete?: (id: string) => void;
}

const BODY_PART_LABELS: Record<string, string> = {
  head: '머리',
  neck: '목',
  chest: '가슴',
  epigastric: '명치',
  abdomen_left_upper: '왼쪽 윗배',
  abdomen_right_upper: '오른쪽 윗배',
  abdomen_left_lower: '왼쪽 아랫배',
  abdomen_right_lower: '오른쪽 아랫배',
  left_shoulder: '왼쪽 어깨',
  right_shoulder: '오른쪽 어깨',
  left_arm_upper: '왼쪽 상완',
  right_arm_upper: '오른쪽 상완',
  left_arm_lower: '왼쪽 전완',
  right_arm_lower: '오른쪽 전완',
  left_hand: '왼쪽 손',
  right_hand: '오른쪽 손',
  left_hip: '왼쪽 골반/엉덩이',
  right_hip: '오른쪽 골반/엉덩이',
  left_thigh: '왼쪽 허벅지',
  right_thigh: '오른쪽 허벅지',
  left_knee: '왼쪽 무릎',
  right_knee: '오른쪽 무릎',
  left_shin: '왼쪽 정강이',
  right_shin: '오른쪽 정강이',
  left_foot: '왼쪽 발',
  right_foot: '오른쪽 발',
  head_back: '뒤통수',
  neck_back: '목 뒤',
  upper_back: '등 상부',
  mid_back: '등 중부',
  lower_back: '허리',
  left_buttock: '왼쪽 엉덩이',
  right_buttock: '오른쪽 엉덩이',
  left_thigh_back: '왼쪽 허벅지 뒤',
  right_thigh_back: '오른쪽 허벅지 뒤',
  left_knee_back: '왼쪽 무릎 뒤',
  right_knee_back: '오른쪽 무릎 뒤',
  left_calf: '왼쪽 종아리',
  right_calf: '오른쪽 종아리',
};

const VARIANT_LABELS: Record<SummaryVariant, { title: string; painLabel: string; typeLabel: string; onsetLabel: string; aggLabel: string }> = {
  user: { title: '증상 요약', painLabel: '통증 강도', typeLabel: '증상 양상', onsetLabel: '발생 시점', aggLabel: '악화 조건' },
  medical: { title: '증상 기록', painLabel: '통증 정도 (NRS)', typeLabel: '양상', onsetLabel: '발병 시기', aggLabel: '악화 인자' },
};

function getPainBarColor(level: number): string {
  if (level <= 3) return 'bg-emerald-400';
  if (level <= 6) return 'bg-yellow-400';
  if (level <= 8) return 'bg-orange-400';
  return 'bg-red-500';
}

export default function SummaryCard({
  symptom,
  variant = 'user',
  onDelete,
}: SummaryCardProps) {
  const labels = VARIANT_LABELS[variant];
  const bodyPartLabel = BODY_PART_LABELS[symptom.bodyPart] || symptom.bodyPart;

  return (
    <div className="relative rounded-2xl bg-white border border-gray-100 shadow-sm p-5 transition-all hover:shadow-md">
      {/* Delete button */}
      {onDelete && (
        <button
          onClick={() => onDelete(symptom.id)}
          className="absolute top-4 right-4 p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
          aria-label="삭제"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-emerald-500">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="12" cy="8" r="2" fill="currentColor" />
            <path d="M12 12v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p className="text-xs text-gray-400 font-medium">{labels.title}</p>
          <p className="text-base font-semibold text-gray-900">{bodyPartLabel}</p>
        </div>
      </div>

      {/* Pain level bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-500">{labels.painLabel}</span>
          <span className="text-xs font-bold text-gray-700">{symptom.painLevel}/10</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getPainBarColor(symptom.painLevel)}`}
            style={{ width: `${symptom.painLevel * 10}%` }}
          />
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2.5 text-sm">
        <div className="flex items-start gap-2">
          <span className="text-gray-400 w-20 shrink-0">{labels.typeLabel}</span>
          <span className="text-gray-800">{symptom.painType}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-gray-400 w-20 shrink-0">{labels.onsetLabel}</span>
          <span className="text-gray-800">{symptom.onset}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-gray-400 w-20 shrink-0">{labels.aggLabel}</span>
          <span className="text-gray-800">{symptom.aggravation}</span>
        </div>
        {symptom.memo && (
          <div className="flex items-start gap-2">
            <span className="text-gray-400 w-20 shrink-0">메모</span>
            <span className="text-gray-600 leading-relaxed">{symptom.memo}</span>
          </div>
        )}
      </div>
    </div>
  );
}
