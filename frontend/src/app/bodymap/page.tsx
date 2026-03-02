'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import BodyMapCanvas from '@/components/bodymap/BodyMapCanvas';
import { FRONT_REGIONS, BACK_REGIONS } from '@/components/bodymap/BodyMapCanvas';
import SymptomPanel from '@/components/bodymap/SymptomPanel';
import { useSymptom } from '@/hooks/useSymptom';
import { useAuth } from '@/contexts/AuthContext';
import type { SymptomInput } from '@/types';

const ALL_REGIONS = [...FRONT_REGIONS, ...BACK_REGIONS];

function getRegionLabel(id: string): string {
  return ALL_REGIONS.find((r) => r.id === id)?.label ?? id;
}

export default function BodyMapPage() {
  const { user } = useAuth();
  const { symptoms, addSymptom, updateSymptom, removeSymptom } = useSymptom(user?.id);

  const [side, setSide] = useState<'front' | 'back'>('front');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [recordedRegions, setRecordedRegions] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleRegionSelect = useCallback((regionId: string) => {
    setSelectedRegion(regionId);
    setEditingIndex(null);
  }, []);

  const handleSymptomSubmit = async (data: SymptomInput) => {
    if (editingIndex !== null) {
      updateSymptom(editingIndex, { ...data, side, x: 0, y: 0 });
      setEditingIndex(null);
    } else {
      await addSymptom({ ...data, side, x: 0, y: 0 });
      setRecordedRegions((prev) =>
        prev.includes(data.bodyPart) ? prev : [...prev, data.bodyPart],
      );
    }
    setSelectedRegion('');
  };

  const handleEditSymptom = (index: number) => {
    const symptom = symptoms[index];
    const symptomSide = symptom.side ?? 'front';
    setSide(symptomSide);
    setSelectedRegion(symptom.bodyPart);
    setEditingIndex(index);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setSelectedRegion('');
  };

  const handleRemoveSymptom = (index: number) => {
    const symptom = symptoms[index];
    removeSymptom(index);
    if (editingIndex === index) {
      setEditingIndex(null);
      setSelectedRegion('');
    }
    const remainingForPart = symptoms.filter(
      (s, i) => i !== index && s.bodyPart === symptom.bodyPart,
    );
    if (remainingForPart.length === 0) {
      setRecordedRegions((prev) => prev.filter((r) => r !== symptom.bodyPart));
    }
  };

  const selectedRegions = selectedRegion ? [selectedRegion] : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">증상 입력</h1>
            {symptoms.length > 0 && (
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-600 text-xs font-bold">
                {symptoms.length}
              </span>
            )}
          </div>
          <Link
            href="/summary"
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              symptoms.length > 0
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            aria-disabled={symptoms.length === 0}
          >
            증상 요약 보기
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Guide section */}
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            어디가 아프신가요?
          </h2>
          <p className="text-gray-500 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
            바디맵에서 아픈 부위를 클릭하세요. 여러 곳이 아프면 하나씩 추가할 수 있습니다.
          </p>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mt-5">
            <StepBadge num={1} label="부위 선택" active={!selectedRegion && symptoms.length === 0} done={!!selectedRegion || symptoms.length > 0} />
            <StepConnector />
            <StepBadge num={2} label="증상 입력" active={!!selectedRegion} done={symptoms.length > 0} />
            <StepConnector />
            <StepBadge num={3} label="요약 확인" active={false} done={false} />
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
          {/* Left: Body Map */}
          <div className="flex justify-center lg:sticky lg:top-24">
            <BodyMapCanvas
              side={side}
              onRegionSelect={handleRegionSelect}
              selectedRegions={selectedRegions}
              recordedRegions={recordedRegions}
              onSideChange={setSide}
            />
          </div>

          {/* Right: Symptom Panel */}
          <div className="w-full lg:w-[420px] flex-shrink-0">
            <SymptomPanel
              selectedRegionId={selectedRegion}
              side={side}
              onSubmit={handleSymptomSubmit}
              editMode={editingIndex !== null}
              initialData={editingIndex !== null ? symptoms[editingIndex] : null}
              onCancelEdit={handleCancelEdit}
            />
          </div>
        </div>

        {/* Recorded symptoms list */}
        {symptoms.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                입력된 증상
              </h2>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-bold">
                {symptoms.length}건
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {symptoms.map((symptom, index) => (
                <div
                  key={symptom.id ?? index}
                  className={`group flex items-start justify-between rounded-xl border px-4 py-3.5 shadow-sm transition-all cursor-pointer ${
                    editingIndex === index
                      ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200 shadow-md'
                      : 'bg-white border-gray-100 hover:shadow-md hover:border-emerald-200'
                  }`}
                  onClick={() => handleEditSymptom(index)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEditSymptom(index); }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${editingIndex === index ? 'bg-blue-400' : 'bg-red-400'}`} />
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {getRegionLabel(symptom.bodyPart)}
                      </p>
                      {editingIndex === index && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-600">
                          수정 중
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-600">
                        {symptom.painType}
                      </span>
                      <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-600">
                        강도 {symptom.painLevel}/10
                      </span>
                      {symptom.onset && (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-600">
                          {symptom.onset}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveSymptom(index); }}
                    className="ml-3 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                    aria-label="삭제"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Next step CTA */}
            <div className="mt-8 text-center">
              <Link
                href="/summary"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-base shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:shadow-emerald-500/30"
              >
                {symptoms.length}개 증상 요약 보기
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepBadge({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
        done ? 'bg-emerald-500 text-white' : active ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300' : 'bg-gray-100 text-gray-400'
      }`}>
        {done ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="m5 12 5 5L20 7" />
          </svg>
        ) : num}
      </div>
      <span className={`text-[10px] font-medium ${active ? 'text-emerald-600' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  );
}

function StepConnector() {
  return <div className="w-8 h-px bg-gray-200 mt-[-12px]" />;
}
