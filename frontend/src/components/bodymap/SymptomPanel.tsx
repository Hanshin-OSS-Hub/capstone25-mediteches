'use client';

import { useState, useEffect } from 'react';
import { FRONT_REGIONS, BACK_REGIONS } from './BodyMapCanvas';

interface SymptomFormData {
  bodyPart: string;
  painLevel: number;
  painType: string;
  onset: string;
  aggravation: string;
  memo: string;
}

interface SymptomPanelProps {
  selectedRegionId: string;
  side: 'front' | 'back';
  onSubmit: (data: SymptomFormData) => void;
  initialData?: Partial<SymptomFormData> | null;
  editMode?: boolean;
  onCancelEdit?: () => void;
}

const PAIN_TYPES = [
  '찌르는 느낌',
  '욱신거림',
  '둔한 통증',
  '타는 느낌',
  '저림/쥐남',
  '쥐어짜는 느낌',
  '뻐근함',
  '당기는 느낌',
  '가려움',
  '기타',
];

const ONSET_OPTIONS = [
  '오늘',
  '어제',
  '2~3일 전',
  '1주일 전',
  '2주 이상',
  '1개월 이상',
];

const AGGRAVATION_OPTIONS = [
  '움직일 때',
  '가만히 있을 때',
  '식후',
  '아침에',
  '밤에',
  '운동 시',
  '스트레스',
  '날씨 변화',
  '눌렀을 때',
  '특별한 조건 없음',
];

const STEPS = [
  { key: 'painType', label: '어떤 느낌인가요?', required: true },
  { key: 'painLevel', label: '얼마나 아픈가요?', required: true },
  { key: 'onset', label: '언제부터 아팠나요?', required: true },
  { key: 'extra', label: '추가 정보', required: false },
] as const;

function getPainLevelColor(level: number) {
  if (level <= 3) return { bg: 'bg-emerald-500', text: 'text-emerald-600', label: '가벼운 통증' };
  if (level <= 6) return { bg: 'bg-yellow-500', text: 'text-yellow-600', label: '보통 통증' };
  if (level <= 8) return { bg: 'bg-orange-500', text: 'text-orange-600', label: '심한 통증' };
  return { bg: 'bg-red-500', text: 'text-red-600', label: '극심한 통증' };
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        px-4 py-2 rounded-full text-[13px] font-medium border transition-all duration-200
        ${selected
          ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm ring-1 ring-emerald-200'
          : 'bg-white border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/40 hover:shadow-sm'
        }
      `}
    >
      {label}
    </button>
  );
}

function ChipAmber({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        px-4 py-2 rounded-full text-[13px] font-medium border transition-all duration-200
        ${selected
          ? 'bg-amber-50 border-amber-400 text-amber-700 shadow-sm ring-1 ring-amber-200'
          : 'bg-white border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50/40 hover:shadow-sm'
        }
      `}
    >
      {label}
    </button>
  );
}

function CompletedBadge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12 5 5L20 7" />
      </svg>
      {text}
    </span>
  );
}

export default function SymptomPanel({
  selectedRegionId,
  side,
  onSubmit,
  initialData,
  editMode = false,
  onCancelEdit,
}: SymptomPanelProps) {
  const [step, setStep] = useState(0);
  const [painLevel, setPainLevel] = useState(5);
  const [painType, setPainType] = useState('');
  const [onset, setOnset] = useState('');
  const [aggravation, setAggravation] = useState('');
  const [memo, setMemo] = useState('');

  useEffect(() => {
    if (initialData && editMode) {
      setPainType(initialData.painType || '');
      setPainLevel(initialData.painLevel || 5);
      setOnset(initialData.onset || '');
      setAggravation(initialData.aggravation || '');
      setMemo(initialData.memo || '');
      setStep(0);
    } else {
      setStep(0);
      setPainLevel(5);
      setPainType('');
      setOnset('');
      setAggravation('');
      setMemo('');
    }
  }, [selectedRegionId, initialData, editMode]);

  const allRegions = [...FRONT_REGIONS, ...BACK_REGIONS];
  const region = allRegions.find((r) => r.id === selectedRegionId);
  const regionLabel = region?.label ?? selectedRegionId;

  const handleSubmit = () => {
    onSubmit({
      bodyPart: selectedRegionId,
      painLevel,
      painType,
      onset,
      aggravation,
      memo,
    });
  };

  const canGoNext = (s: number) => {
    if (s === 0) return !!painType;
    if (s === 1) return true;
    if (s === 2) return !!onset;
    return true;
  };

  const goNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };
  const goBack = () => {
    if (step > 0) setStep(step - 1);
  };

  if (!selectedRegionId) {
    return (
      <div className="w-full max-w-md rounded-2xl bg-white border border-gray-100 shadow-sm p-10 flex flex-col items-center justify-center min-h-[420px]">
        <div className="w-14 h-14 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mb-5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Z" />
            <path d="M8 12h8M12 8v8" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-gray-700 mb-2">부위를 선택해주세요</p>
        <p className="text-sm text-gray-400 text-center leading-relaxed">
          바디맵에서 아픈 부위를 클릭하면<br />
          증상을 단계별로 입력할 수 있습니다
        </p>
      </div>
    );
  }

  const painInfo = getPainLevelColor(painLevel);

  return (
    <div className="w-full max-w-md rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      {/* Region header */}
      <div className={`px-6 py-4 ${side === 'front' ? 'bg-emerald-50/70 border-b border-emerald-100' : 'bg-blue-50/70 border-b border-blue-100'}`}>
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${editMode ? 'text-blue-400' : side === 'front' ? 'text-emerald-400' : 'text-blue-400'}`}>
              {editMode ? '수정 중' : '선택 부위'} · {side === 'front' ? '앞면' : '뒷면'}
            </span>
            <p className="mt-0.5 text-lg font-bold text-gray-900">{regionLabel}</p>
          </div>
          <div className="flex items-center gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i <= step ? 'w-5 bg-emerald-400' : 'w-2 bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Completed steps summary */}
        {step > 0 && (
          <div className="mb-5 space-y-2">
            {step > 0 && painType && (
              <button type="button" onClick={() => setStep(0)} className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left group">
                <span className="text-xs text-gray-400">느낌</span>
                <CompletedBadge text={painType} />
              </button>
            )}
            {step > 1 && (
              <button type="button" onClick={() => setStep(1)} className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left group">
                <span className="text-xs text-gray-400">강도</span>
                <CompletedBadge text={`${painLevel}점 · ${painInfo.label}`} />
              </button>
            )}
            {step > 2 && onset && (
              <button type="button" onClick={() => setStep(2)} className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left group">
                <span className="text-xs text-gray-400">시작</span>
                <CompletedBadge text={onset} />
              </button>
            )}
          </div>
        )}

        {/* Step 0: Pain type */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-[15px] font-bold text-gray-800 mb-1">어떤 느낌인가요?</h3>
              <p className="text-xs text-gray-400">가장 가까운 느낌을 하나 골라주세요</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {PAIN_TYPES.map((value) => (
                <Chip
                  key={value}
                  label={value}
                  selected={painType === value}
                  onClick={() => setPainType(painType === value ? '' : value)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Pain level */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-[15px] font-bold text-gray-800 mb-1">얼마나 아픈가요?</h3>
              <p className="text-xs text-gray-400">슬라이더를 움직여 통증 강도를 선택하세요</p>
            </div>

            <div className="flex flex-col items-center py-4">
              <div className={`text-4xl font-black ${painInfo.text} mb-1`}>
                {painLevel}
              </div>
              <div className={`text-sm font-semibold ${painInfo.text}`}>
                {painInfo.label}
              </div>
            </div>

            <div>
              <input
                type="range"
                min="1"
                max="10"
                value={painLevel}
                onChange={(e) => setPainLevel(Number(e.target.value))}
                title="통증 강도 조절"
                className="w-full h-2.5 rounded-full appearance-none cursor-pointer
                           bg-gradient-to-r from-emerald-300 via-yellow-300 via-orange-300 to-red-400
                           [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
                           [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                           [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-gray-300
                           [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer
                           [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
              />
              <div className="flex justify-between text-[11px] text-gray-400 mt-2 px-0.5">
                <span>1 거의 안 아픔</span>
                <span>5 보통</span>
                <span>10 극심</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Onset */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-[15px] font-bold text-gray-800 mb-1">언제부터 아팠나요?</h3>
              <p className="text-xs text-gray-400">증상이 시작된 시점을 골라주세요</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {ONSET_OPTIONS.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  selected={onset === option}
                  onClick={() => setOnset(onset === option ? '' : option)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Aggravation + memo */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <div className="mb-1">
                <h3 className="text-[15px] font-bold text-gray-800 mb-1">언제 더 아픈가요?</h3>
                <p className="text-xs text-gray-400">해당하는 것을 골라주세요 (선택)</p>
              </div>
              <div className="flex flex-wrap gap-2.5 mt-3">
                {AGGRAVATION_OPTIONS.map((option) => (
                  <ChipAmber
                    key={option}
                    label={option}
                    selected={aggravation === option}
                    onClick={() => setAggravation(aggravation === option ? '' : option)}
                  />
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="memo" className="block text-[15px] font-bold text-gray-800 mb-1">
                추가로 알려줄 것이 있나요?
              </label>
              <p className="text-xs text-gray-400 mb-3">다른 증상이나 특이사항 (선택)</p>
              <textarea
                id="memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={3}
                placeholder="자유롭게 적어주세요"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm resize-none
                           focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent
                           placeholder:text-gray-300"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center gap-3 mt-8">
          {step > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 border border-gray-200
                         hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300 transition-all"
            >
              이전
            </button>
          )}

          {editMode && onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 border border-gray-200
                         hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300 transition-all"
            >
              취소
            </button>
          )}

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext(step)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                canGoNext(step)
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              }`}
            >
              다음
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all ${
                editMode
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}
            >
              {editMode ? '증상 수정 완료' : '이 부위 증상 추가'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
