'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { SymptomInput, DepartmentRecommendation } from '@/types';
import * as api from '@/lib/api';
import { useSymptom } from '@/hooks/useSymptom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

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

export default function RecommendPage() {
  const router = useRouter();
  const { symptoms } = useSymptom();

  const [localSymptoms, setLocalSymptoms] = useState<SymptomInput[]>([]);
  const [recommendations, setRecommendations] = useState<DepartmentRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (symptoms.length > 0) {
      setLocalSymptoms(symptoms);
      return;
    }

    try {
      const stored = localStorage.getItem('meditech_symptoms');
      if (stored) {
        setLocalSymptoms(JSON.parse(stored));
      }
    } catch {
      /* localStorage unavailable */
    }
  }, [symptoms]);

  const activeSymptoms = localSymptoms.length > 0 ? localSymptoms : symptoms;

  async function handleRecommend() {
    if (activeSymptoms.length === 0) return;

    setLoading(true);
    setError(null);
    try {
      const results = await api.recommendDepartments(activeSymptoms);
      setRecommendations(results);
      setHasSearched(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '추천 결과를 불러오는 중 오류가 발생했습니다.',
      );
    } finally {
      setLoading(false);
    }
  }

  if (activeSymptoms.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-gray-400">
            <path
              d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-semibold text-gray-900">입력된 증상이 없습니다</h2>
        <p className="mb-8 text-gray-500">
          진료과 추천을 받으려면 먼저 바디맵에서 증상을 입력해주세요.
        </p>
        <Button onClick={() => router.push('/bodymap')}>바디맵으로 이동</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">진료과 추천</h1>
        <p className="text-gray-500">
          입력된 증상을 기반으로 적절한 진료과를 안내합니다
        </p>
      </div>

      {/* Disclaimer */}
      <div className="mb-8 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
        <div className="flex items-start gap-3">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            className="mt-0.5 shrink-0 text-yellow-600"
          >
            <path
              d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-sm leading-relaxed text-yellow-800">
            본 추천은 의료 진단이 아니며, 참고용 정보입니다. 정확한 진단은 의료
            전문가와 상담하세요.
          </p>
        </div>
      </div>

      {/* Symptoms Summary */}
      <Card className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">입력된 증상 요약</h2>
        <div className="space-y-3">
          {activeSymptoms.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-sm font-semibold text-emerald-700">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">
                  {BODY_PART_LABELS[s.bodyPart] ?? s.bodyPart}
                </p>
                <p className="truncate text-sm text-gray-500">
                  {s.painType} · 강도 {s.painLevel}/10 · {s.onset}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recommend Button */}
      {!hasSearched && (
        <div className="mb-10 text-center">
          <Button size="lg" onClick={handleRecommend} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="opacity-25"
                  />
                  <path
                    d="M4 12a8 8 0 0 1 8-8"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="opacity-75"
                  />
                </svg>
                분석 중...
              </span>
            ) : (
              '추천 받기'
            )}
          </Button>
        </div>
      )}

      {/* Loading */}
      {loading && hasSearched && (
        <div className="flex flex-col items-center justify-center py-16">
          <svg className="mb-4 h-10 w-10 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              className="opacity-25"
            />
            <path
              d="M4 12a8 8 0 0 1 8-8"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              className="opacity-75"
            />
          </svg>
          <p className="text-gray-500">진료과를 분석하고 있습니다...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button
            onClick={handleRecommend}
            className="ml-2 font-medium underline hover:no-underline"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Results */}
      {!loading && hasSearched && recommendations.length === 0 && !error && (
        <div className="py-12 text-center">
          <p className="text-gray-500">추천 결과가 없습니다. 증상을 다시 확인해주세요.</p>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="mb-10 space-y-4">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">추천 진료과</h2>
          {recommendations.map((rec, i) => (
            <Card key={i} hoverable className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                    {i + 1}
                  </span>
                  <h3 className="text-lg font-bold text-gray-900">{rec.department}</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 sm:ml-10">
                  {rec.reason}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 self-start sm:self-center"
                onClick={() =>
                  router.push(`/hospital?department=${encodeURIComponent(rec.department)}`)
                }
              >
                이 진료과 병원 찾기
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="flex flex-col items-center gap-3 border-t border-gray-100 pt-8">
        {hasSearched && (
          <Button onClick={() => router.push('/hospital')} size="lg">
            병원 찾기로 이동
          </Button>
        )}
        <Button variant="ghost" onClick={() => router.push('/bodymap')}>
          증상 다시 입력하기
        </Button>
      </div>
    </div>
  );
}
