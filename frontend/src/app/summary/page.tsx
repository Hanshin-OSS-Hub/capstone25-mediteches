'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import SummaryCard from '@/components/symptom/SummaryCard';
import MedicalView from '@/components/symptom/MedicalView';
import { useSymptom } from '@/hooks/useSymptom';
import { useAuth } from '@/contexts/AuthContext';
import * as api from '@/lib/api';
import type { DepartmentRecommendation, Hospital } from '@/types';

type TabKey = 'user' | 'medical';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'user', label: '사용자용' },
  { key: 'medical', label: '진료 전달용' },
];

const URGENCY_CONFIG = {
  emergency: {
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-700',
    badge: 'bg-red-500 text-white',
    label: '긴급',
    message: '즉시 병원 방문을 권장합니다',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-red-500">
        <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  caution: {
    bg: 'bg-orange-50 border-orange-200',
    text: 'text-orange-700',
    badge: 'bg-orange-500 text-white',
    label: '주의',
    message: '빠른 시일 내 진료를 권장합니다',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-orange-500">
        <path d="M12 9v2m0 4h.01M10.29 3.86l-8.6 14.5A1.98 1.98 0 003.4 21h17.2a1.98 1.98 0 001.71-2.64l-8.6-14.5a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  normal: null,
} as const;

export default function SummaryPage() {
  const { user } = useAuth();
  const { symptoms, removeSymptom, analyzeSymptoms } = useSymptom(user?.id);

  const [activeTab, setActiveTab] = useState<TabKey>('user');
  const [analysis, setAnalysis] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const [recommendations, setRecommendations] = useState<DepartmentRecommendation[]>([]);
  const [recommending, setRecommending] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [searchingHospitals, setSearchingHospitals] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationError, setLocationError] = useState('');

  const urgency = recommendations.length > 0 ? (recommendations[0].urgency ?? 'normal') : null;

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const result = await analyzeSymptoms();
      setAnalysis(result);
    } catch {
      setAnalysis('분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRecommend = async () => {
    setRecommending(true);
    setRecommendations([]);
    setSelectedDept(null);
    setHospitals([]);
    try {
      const result = await api.recommendDepartments(symptoms);
      setRecommendations(result);
    } catch {
      setRecommendations([]);
    } finally {
      setRecommending(false);
    }
  };

  const getUserLocation = useCallback((): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (userLat !== null && userLng !== null) {
        resolve({ lat: userLat, lng: userLng });
        return;
      }
      if (!navigator.geolocation) {
        reject(new Error('위치 서비스를 사용할 수 없습니다.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => reject(new Error('위치 권한이 거부되었습니다.')),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }, [userLat, userLng]);

  const handleSearchHospitals = async (dept: string) => {
    setSelectedDept(dept);
    setSearchingHospitals(true);
    setHospitals([]);
    setLocationError('');
    try {
      const loc = await getUserLocation();
      const result = await api.searchHospitals(loc.lat, loc.lng, dept);
      setHospitals(result);
    } catch (e) {
      setLocationError(e instanceof Error ? e.message : '병원 검색 중 오류가 발생했습니다.');
    } finally {
      setSearchingHospitals(false);
    }
  };

  const handleDelete = (id: string) => {
    const index = symptoms.findIndex((s) => s.id === id);
    if (index !== -1) removeSymptom(index);
  };

  if (symptoms.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-gray-300">
              <path d="M9 12h6M12 9v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <p className="text-gray-500 mb-2">아직 입력된 증상이 없습니다.</p>
          <p className="text-sm text-gray-400 mb-6">바디맵에서 증상을 입력해주세요.</p>
          <Link
            href="/bodymap"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
          >
            바디맵으로 이동
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/bodymap"
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors mb-2 inline-block"
          >
            ← 바디맵으로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">증상 요약 카드</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Medical tab → dedicated MedicalView */}
        {activeTab === 'medical' ? (
          <MedicalView symptoms={symptoms} />
        ) : (
          <>
            {/* Symptom cards - 2-column grid on tablet */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {symptoms.map((symptom) => (
                <SummaryCard
                  key={symptom.id}
                  symptom={symptom}
                  variant={activeTab}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {/* Next steps card */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">다음 단계</p>

              {/* Action buttons — side by side on tablet, stacked on mobile */}
              {!analyzing && !analysis && !recommending && recommendations.length === 0 && (
                <div className="flex flex-col md:flex-row gap-3">
                  <button
                    onClick={handleAnalyze}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-indigo-200 text-indigo-600 text-sm font-medium hover:bg-indigo-50 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                      <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7l3-7z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
                    </svg>
                    AI 증상 분석
                  </button>
                  <button
                    onClick={handleRecommend}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors shadow-sm"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    진료과 추천 받기
                  </button>
                </div>
              )}

              {/* Show remaining solo button when one action is done */}
              {!analyzing && !analysis && (recommending || recommendations.length > 0) && null}
              {(analysis || analyzing) && !recommending && recommendations.length === 0 && (
                <div className="flex justify-end mt-0">
                  <button
                    onClick={handleRecommend}
                    className="flex items-center gap-2 py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors shadow-sm"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    진료과 추천 받기
                  </button>
                </div>
              )}
              {!analyzing && !analysis && recommending && (
                <div className="flex justify-start">
                  <button
                    onClick={handleAnalyze}
                    className="flex items-center gap-2 py-2 px-4 rounded-xl border border-indigo-200 text-indigo-600 text-sm font-medium hover:bg-indigo-50 transition-colors"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0">
                      <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7l3-7z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
                    </svg>
                    AI 증상 분석
                  </button>
                </div>
              )}

              {/* AI Analysis loading */}
              {analyzing && (
                <div className="mt-4 rounded-xl bg-indigo-50/50 border border-indigo-100 p-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative w-12 h-12 mb-4">
                      <div className="absolute inset-0 rounded-full border-[3px] border-indigo-100" />
                      <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-indigo-500 animate-spin" />
                    </div>
                    <p className="text-sm font-medium text-gray-700 mb-1">증상을 분석하고 있습니다</p>
                    <p className="text-xs text-gray-400 mb-4">가능한 원인과 조언을 준비 중입니다</p>
                    <div className="w-full max-w-[200px]">
                      <div className="h-1 bg-indigo-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full animate-progress" />
                      </div>
                    </div>
                  </div>
                  <style jsx>{`
                    @keyframes progress { 0%{width:0%} 20%{width:25%} 50%{width:60%} 80%{width:85%} 100%{width:95%} }
                    .animate-progress { animation: progress 12s ease-out forwards; }
                  `}</style>
                </div>
              )}

              {/* AI Analysis result */}
              {analysis && (
                <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-indigo-500">
                        <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7l3-7z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
                      </svg>
                      <h3 className="text-xs font-semibold text-gray-600">AI 분석 결과</h3>
                    </div>
                    <button
                      onClick={() => { setAnalysis(''); handleAnalyze(); }}
                      className="text-[11px] text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
                    >
                      다시 분석
                    </button>
                  </div>
                  <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{analysis}</div>
                </div>
              )}

              {/* Department Recommendation loading */}
              {recommending && (
                <div className="mt-4 flex items-center gap-3 p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                  <div className="w-5 h-5 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin shrink-0" />
                  <p className="text-sm text-gray-500">진료과를 추천하고 있습니다...</p>
                </div>
              )}

            </div>

            {/* Urgency Banner — outside the card for visual prominence */}
            {urgency && urgency !== 'normal' && URGENCY_CONFIG[urgency] && (
              <div className={`flex items-center gap-3 p-4 rounded-xl border ${URGENCY_CONFIG[urgency]!.bg}`}>
                {URGENCY_CONFIG[urgency]!.icon}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${URGENCY_CONFIG[urgency]!.badge}`}>
                      {URGENCY_CONFIG[urgency]!.label}
                    </span>
                  </div>
                  <p className={`text-sm font-medium ${URGENCY_CONFIG[urgency]!.text}`}>
                    {URGENCY_CONFIG[urgency]!.message}
                  </p>
                </div>
              </div>
            )}

            {/* Department Recommendation Results */}
            {recommendations.length > 0 && (
              <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-emerald-500">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <h3 className="text-sm font-semibold text-gray-700">추천 진료과</h3>
                  </div>
                  <button
                    onClick={handleRecommend}
                    className="text-[11px] text-emerald-500 hover:text-emerald-700 font-medium transition-colors"
                  >
                    다시 추천
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {recommendations.map((rec, i) => (
                    <button
                      key={i}
                      onClick={() => handleSearchHospitals(rec.department)}
                      className={`text-left p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                        selectedDept === rec.department
                          ? 'border-emerald-400 bg-emerald-50'
                          : 'border-gray-100 bg-gray-50 hover:border-emerald-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-800">{rec.department}</span>
                        {rec.urgency && rec.urgency !== 'normal' && URGENCY_CONFIG[rec.urgency] && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${URGENCY_CONFIG[rec.urgency]!.badge}`}>
                            {URGENCY_CONFIG[rec.urgency]!.label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{rec.reason}</p>
                      <p className="text-[10px] text-emerald-500 font-medium mt-2">
                        {selectedDept === rec.department ? '검색 중...' : '클릭하여 주변 병원 찾기 →'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Location Error */}
            {locationError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                {locationError}
              </div>
            )}

            {/* Hospital Search Loading */}
            {searchingHospitals && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-5 h-5 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin shrink-0" />
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{selectedDept}</span> 주변 병원을 검색하고 있습니다...
                </p>
              </div>
            )}

            {/* Hospital Results */}
            {hospitals.length > 0 && !searchingHospitals && (
              <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-blue-500">
                    <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <h3 className="text-sm font-semibold text-gray-700">
                    주변 <span className="text-emerald-600">{selectedDept}</span> 병원
                  </h3>
                  <span className="text-xs text-gray-400">{hospitals.length}건</span>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {hospitals.map((h) => (
                    <div key={h.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-blue-600">
                          <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm text-gray-800 truncate">{h.name}</span>
                          {h.type && (
                            <span className="text-[10px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full shrink-0">{h.type}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{h.address}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          {h.phone && (
                            <a href={`tel:${h.phone}`} className="text-xs text-blue-500 hover:text-blue-700 font-medium">
                              {h.phone}
                            </a>
                          )}
                          {h.distance != null && (
                            <span className="text-xs text-gray-400">
                              {h.distance < 1 ? `${Math.round(h.distance * 1000)}m` : `${h.distance.toFixed(1)}km`}
                            </span>
                          )}
                          {h.doctorCount != null && h.doctorCount > 0 && (
                            <span className="text-xs text-gray-400">의사 {h.doctorCount}명</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No hospitals found */}
            {selectedDept && !searchingHospitals && hospitals.length === 0 && !locationError && recommendations.length > 0 && (
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-500 text-center">
                주변에 해당 진료과 병원을 찾지 못했습니다. 위치를 확인해주세요.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
