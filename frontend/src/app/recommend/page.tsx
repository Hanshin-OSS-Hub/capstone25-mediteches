'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import html2canvas from 'html2canvas';
import type { SymptomInput, DepartmentRecommendation } from '@/types';
import * as api from '@/lib/api';
import { classifyDepartments } from '@/lib/departmentClassifier';
import { useSymptom } from '@/hooks/useSymptom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const BODY_PART_LABELS: Record<string, string> = {
  head: '머리', neck: '목', chest: '가슴', epigastric: '명치',
  abdomen_left_upper: '왼쪽 윗배', abdomen_right_upper: '오른쪽 윗배',
  abdomen_left_lower: '왼쪽 아랫배', abdomen_right_lower: '오른쪽 아랫배',
  left_shoulder: '왼쪽 어깨', right_shoulder: '오른쪽 어깨',
  left_arm_upper: '왼쪽 상완', right_arm_upper: '오른쪽 상완',
  left_arm_lower: '왼쪽 전완', right_arm_lower: '오른쪽 전완',
  left_hand: '왼쪽 손', right_hand: '오른쪽 손',
  left_hip: '왼쪽 골반/엉덩이', right_hip: '오른쪽 골반/엉덩이',
  left_thigh: '왼쪽 허벅지', right_thigh: '오른쪽 허벅지',
  left_knee: '왼쪽 무릎', right_knee: '오른쪽 무릎',
  left_shin: '왼쪽 정강이', right_shin: '오른쪽 정강이',
  left_foot: '왼쪽 발', right_foot: '오른쪽 발',
  head_back: '뒤통수', neck_back: '목 뒤',
  upper_back: '등 상부', mid_back: '등 중부', lower_back: '허리',
  left_buttock: '왼쪽 엉덩이', right_buttock: '오른쪽 엉덩이',
  left_thigh_back: '왼쪽 허벅지 뒤', right_thigh_back: '오른쪽 허벅지 뒤',
  left_knee_back: '왼쪽 무릎 뒤', right_knee_back: '오른쪽 무릎 뒤',
  left_calf: '왼쪽 종아리', right_calf: '오른쪽 종아리',
};

const URGENCY_STYLES = {
  emergency: { border: 'border-red-300', bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-500 text-white', label: '긴급', msg: '즉시 응급실 방문을 권장합니다' },
  caution: { border: 'border-orange-300', bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-500 text-white', label: '주의', msg: '가급적 빠른 시일 내 진료를 권장합니다' },
} as const;

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-yellow-500' : 'bg-gray-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-500 tabular-nums w-10 text-right">{value}%</span>
    </div>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={filled ? 'text-amber-400' : 'text-gray-400'}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function CompareView({ ruleResults, aiResults }: { ruleResults: DepartmentRecommendation[]; aiResults: DepartmentRecommendation[] }) {
  const ruleDepts = new Set(ruleResults.map(r => r.department));
  const aiDepts = new Set(aiResults.map(r => r.department));
  const allDepts = [...new Set([...ruleResults.map(r => r.department), ...aiResults.map(r => r.department)])];

  return (
    <div className="mt-6 rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="grid grid-cols-2 border-b border-gray-100 bg-gray-50">
        <div className="px-4 py-3 text-sm font-semibold text-gray-700 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          규칙 기반 분석
        </div>
        <div className="px-4 py-3 text-sm font-semibold text-gray-700 flex items-center gap-2 border-l border-gray-100">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          AI (GPT-4) 분석
        </div>
      </div>
      {allDepts.map(dept => {
        const rule = ruleResults.find(r => r.department === dept);
        const ai = aiResults.find(r => r.department === dept);
        const both = ruleDepts.has(dept) && aiDepts.has(dept);
        return (
          <div key={dept} className="grid grid-cols-2 border-b border-gray-50 last:border-b-0">
            <div className={`px-4 py-3 ${rule ? '' : 'opacity-30'}`}>
              {rule ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-gray-800">{dept}</span>
                    {both && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-emerald-500">
                        <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {rule.confidence != null && (
                      <span className="text-[10px] font-medium text-gray-400">{rule.confidence}%</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{rule.reason}</p>
                  <span className="inline-block mt-1 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full font-medium">규칙 매칭</span>
                </>
              ) : (
                <p className="text-xs text-gray-300 italic">해당 없음</p>
              )}
            </div>
            <div className={`px-4 py-3 border-l border-gray-50 ${ai ? '' : 'opacity-30'}`}>
              {ai ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-gray-800">{dept}</span>
                    {both && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-emerald-500">
                        <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{ai.reason}</p>
                  <span className="inline-block mt-1 text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full font-medium">GPT-4 분석</span>
                </>
              ) : (
                <p className="text-xs text-gray-300 italic">해당 없음</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function RecommendPage() {
  const router = useRouter();
  const { symptoms } = useSymptom();

  const [localSymptoms, setLocalSymptoms] = useState<SymptomInput[]>([]);
  const [recommendations, setRecommendations] = useState<DepartmentRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [showCompare, setShowCompare] = useState(false);
  const [aiResults, setAiResults] = useState<DepartmentRecommendation[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackValue, setFeedbackValue] = useState<boolean | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [saving, setSaving] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (symptoms.length > 0) { setLocalSymptoms(symptoms); return; }
    try {
      const stored = localStorage.getItem('meditech_symptoms');
      if (stored) setLocalSymptoms(JSON.parse(stored));
    } catch { /* noop */ }
  }, [symptoms]);

  const activeSymptoms = localSymptoms.length > 0 ? localSymptoms : symptoms;

  async function handleRecommend() {
    if (activeSymptoms.length === 0) return;
    setLoading(true);
    setShowCompare(false);
    setAiResults([]);
    setAiError(null);

    await new Promise(r => setTimeout(r, 600 + Math.random() * 600));
    const results = classifyDepartments(activeSymptoms);
    setRecommendations(results);
    setHasSearched(true);
    setLoading(false);
  }

  async function handleCompare() {
    if (showCompare) { setShowCompare(false); return; }
    setShowCompare(true);
    if (aiResults.length > 0) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const results = await api.recommendDepartments(activeSymptoms);
      setAiResults(results);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI 분석을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSaveImage() {
    if (!resultRef.current) return;
    setSaving(true);
    try {
      const canvas = await html2canvas(resultRef.current, { backgroundColor: '#ffffff', scale: 2 });
      const link = document.createElement('a');
      link.download = `진료과추천_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch { /* noop */ } finally {
      setSaving(false);
    }
  }

  async function handleFeedback(helpful: boolean) {
    setFeedbackValue(helpful);
    setFeedbackSent(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departments: recommendations.map(r => r.department),
          helpful,
          comment: feedbackComment || undefined,
        }),
      });
    } catch { /* best-effort */ }
  }

  const topUrgency = recommendations[0]?.urgency;

  if (activeSymptoms.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-gray-400">
            <path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-semibold text-gray-900">입력된 증상이 없습니다</h2>
        <p className="mb-8 text-gray-500">진료과 추천을 받으려면 먼저 바디맵에서 증상을 입력해주세요.</p>
        <Button onClick={() => router.push('/bodymap')}>바디맵으로 이동</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">진료과 추천</h1>
        <p className="text-gray-500">입력된 증상을 기반으로 적절한 진료과를 안내합니다</p>
      </div>

      <div className="mb-8 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
        <div className="flex items-start gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-yellow-600">
            <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-sm leading-relaxed text-yellow-800">본 추천은 의료 진단이 아니며, 참고용 정보입니다. 정확한 진단은 의료 전문가와 상담하세요.</p>
        </div>
      </div>

      <Card className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">입력된 증상 요약</h2>
        <div className="space-y-3">
          {activeSymptoms.map((s, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-sm font-semibold text-emerald-700">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{BODY_PART_LABELS[s.bodyPart] ?? s.bodyPart}</p>
                <p className="truncate text-sm text-gray-500">{s.painType} · 강도 {s.painLevel}/10 · {s.onset}{s.aggravation && s.aggravation !== '특별한 조건 없음' ? ` · ${s.aggravation}` : ''}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {!hasSearched && (
        <div className="mb-10 text-center">
          <Button size="lg" onClick={handleRecommend} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                </svg>
                증상 분석 중...
              </span>
            ) : '추천 받기'}
          </Button>
        </div>
      )}

      {loading && hasSearched && (
        <div className="flex flex-col items-center justify-center py-16">
          <svg className="mb-4 h-10 w-10 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
            <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
          </svg>
          <p className="text-gray-500">증상 패턴을 분석하고 있습니다...</p>
        </div>
      )}

      {/* Urgency banner */}
      {!loading && topUrgency && topUrgency !== 'normal' && topUrgency in URGENCY_STYLES && (
        <div className={`mb-6 flex items-center gap-3 rounded-xl border p-4 ${URGENCY_STYLES[topUrgency].border} ${URGENCY_STYLES[topUrgency].bg}`}>
          <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${URGENCY_STYLES[topUrgency].badge}`}>
            {URGENCY_STYLES[topUrgency].label}
          </span>
          <p className={`text-sm font-medium ${URGENCY_STYLES[topUrgency].text}`}>
            {URGENCY_STYLES[topUrgency].msg}
          </p>
        </div>
      )}

      {!loading && hasSearched && recommendations.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-gray-500">추천 결과가 없습니다. 증상을 다시 확인해주세요.</p>
        </div>
      )}

      {recommendations.length > 0 && (
        <div ref={resultRef} className="mb-10 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">추천 진료과</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveImage}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 bg-white text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-all"
                title="결과 이미지로 저장"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {saving ? '저장 중...' : '저장'}
              </button>
            <button
              onClick={handleCompare}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                showCompare
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-600'
              }`}
              title="AI 결과와 비교"
            >
              <StarIcon filled={showCompare} />
              {showCompare ? '비교 닫기' : 'AI 비교'}
            </button>
            </div>
          </div>

          {recommendations.map((rec, i) => (
            <Card key={i} hoverable className="flex flex-col gap-3">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">{i + 1}</span>
                    <h3 className="text-lg font-bold text-gray-900">{rec.department}</h3>
                    {rec.urgency && rec.urgency !== 'normal' && rec.urgency in URGENCY_STYLES && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${URGENCY_STYLES[rec.urgency].badge}`}>
                        {URGENCY_STYLES[rec.urgency].label}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600 sm:ml-10">{rec.reason}</p>
                </div>
                <Button
                  variant="outline" size="sm" className="shrink-0 self-start sm:self-center"
                  onClick={() => router.push(`/hospital?department=${encodeURIComponent(rec.department)}`)}
                >
                  이 진료과 병원 찾기
                </Button>
              </div>
              {rec.confidence != null && (
                <div className="sm:ml-10">
                  <ConfidenceBar value={rec.confidence} />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Compare mode */}
      {showCompare && (
        <div className="mb-10">
          {aiLoading && (
            <div className="flex items-center gap-3 p-6 rounded-xl bg-indigo-50 border border-indigo-100">
              <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin shrink-0" />
              <p className="text-sm text-gray-600">AI(GPT-4)에 분석을 요청하고 있습니다...</p>
            </div>
          )}
          {aiError && (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
              {aiError}
              <button onClick={handleCompare} className="ml-2 font-medium underline hover:no-underline">다시 시도</button>
            </div>
          )}
          {!aiLoading && !aiError && aiResults.length > 0 && (
            <CompareView ruleResults={recommendations} aiResults={aiResults} />
          )}
        </div>
      )}

      {/* Feedback */}
      {hasSearched && recommendations.length > 0 && (
        <div className="mb-10 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          {!feedbackSent ? (
            <>
              <p className="text-sm font-semibold text-gray-700 mb-3">이 추천이 도움이 되었나요?</p>
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => handleFeedback(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-200 text-emerald-600 text-sm font-medium hover:bg-emerald-50 transition"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" /><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></svg>
                  도움이 됐어요
                </button>
                <button
                  onClick={() => handleFeedback(false)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15V19a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" /><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" /></svg>
                  아쉬워요
                </button>
              </div>
              <input
                type="text"
                placeholder="추가 의견이 있다면 입력해주세요 (선택)"
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-emerald-500">
                <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-gray-600">
                {feedbackValue ? '감사합니다! 소중한 피드백이 반영됩니다.' : '의견 감사합니다. 더 나은 추천을 위해 개선하겠습니다.'}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col items-center gap-3 border-t border-gray-100 pt-8">
        {hasSearched && (
          <Button onClick={() => router.push('/hospital')} size="lg">병원 찾기로 이동</Button>
        )}
        <Button variant="ghost" onClick={() => router.push('/bodymap')}>증상 다시 입력하기</Button>
      </div>
    </div>
  );
}
