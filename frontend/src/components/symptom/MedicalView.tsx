'use client';

import { useState } from 'react';
import type { SymptomRecord } from '@/types';
import {
  FRONT_REGIONS,
  BACK_REGIONS,
  BODY_OUTLINE_FRONT,
  BODY_OUTLINE_BACK,
} from '@/components/bodymap/BodyMapCanvas';

interface MedicalViewProps {
  symptoms: SymptomRecord[];
}

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

function getPainLevelColor(level: number): string {
  if (level <= 3) return '#10b981';
  if (level <= 6) return '#f59e0b';
  if (level <= 8) return '#f97316';
  return '#ef4444';
}

function getPainBarClass(level: number): string {
  if (level <= 3) return 'bg-emerald-400';
  if (level <= 6) return 'bg-yellow-400';
  if (level <= 8) return 'bg-orange-400';
  return 'bg-red-500';
}

function getPainLevelText(level: number): string {
  if (level <= 2) return '경미';
  if (level <= 4) return '약간';
  if (level <= 6) return '중간';
  if (level <= 8) return '심함';
  return '극심';
}

const FRONT_IDS = new Set(FRONT_REGIONS.map((r) => r.id));
const BACK_IDS = new Set(BACK_REGIONS.map((r) => r.id));

export default function MedicalView({ symptoms }: MedicalViewProps) {
  const [additionalNote, setAdditionalNote] = useState('');

  const frontRecorded = symptoms
    .filter((s) => (s.side === 'front' || !s.side) && FRONT_IDS.has(s.bodyPart))
    .map((s) => s.bodyPart);
  const backRecorded = symptoms
    .filter((s) => s.side === 'back' || BACK_IDS.has(s.bodyPart))
    .map((s) => s.bodyPart);

  const hasFront = frontRecorded.length > 0;
  const hasBack = backRecorded.length > 0;

  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const maxPain = symptoms.length > 0 ? Math.max(...symptoms.map((s) => s.painLevel)) : 0;

  return (
    <div className="space-y-5 print:space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 print:border-gray-300">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">환자 사전 문진표</h2>
            <p className="text-xs text-gray-400">작성일시 {dateStr}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="text-xs text-slate-600 hover:text-slate-900 font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            인쇄 / 저장
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
          <span className="text-xs text-gray-400">통증 부위</span>
          <span className="text-sm font-bold text-gray-800">{symptoms.length}곳</span>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
          <span className="text-xs text-gray-400">최고 NRS</span>
          <span className="text-sm font-bold" style={{ color: getPainLevelColor(maxPain) }}>{maxPain}/10</span>
          <span className="text-[10px] text-gray-400">({getPainLevelText(maxPain)})</span>
        </div>
        {symptoms[0]?.onset && (
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
            <span className="text-xs text-gray-400">최초 발생</span>
            <span className="text-sm font-semibold text-gray-700">{symptoms[0].onset}</span>
          </div>
        )}
      </div>

      {/* Main content: body map + table */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        {/* Mini body map */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">통증 부위 맵</h3>
            <div className="flex gap-2 justify-center">
              {hasFront && (
                <MiniBodyMap
                  side="front"
                  regions={FRONT_REGIONS}
                  outline={BODY_OUTLINE_FRONT}
                  recordedParts={frontRecorded}
                  symptoms={symptoms}
                />
              )}
              {hasBack && (
                <MiniBodyMap
                  side="back"
                  regions={BACK_REGIONS}
                  outline={BODY_OUTLINE_BACK}
                  recordedParts={backRecorded}
                  symptoms={symptoms}
                />
              )}
              {!hasFront && !hasBack && (
                <MiniBodyMap
                  side="front"
                  regions={FRONT_REGIONS}
                  outline={BODY_OUTLINE_FRONT}
                  recordedParts={[]}
                  symptoms={[]}
                />
              )}
            </div>
            <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />1-3 경미</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" />4-6 중간</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" />7-8 심함</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />9-10 극심</span>
            </div>
          </div>
        </div>

        {/* Symptom detail table */}
        <div className="md:col-span-3">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">증상 상세 기록</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs border-b border-gray-100">
                    <th className="text-left px-3 py-2 font-semibold">부위</th>
                    <th className="text-center px-2 py-2 font-semibold w-16">NRS</th>
                    <th className="text-left px-3 py-2 font-semibold">양상</th>
                    <th className="text-left px-3 py-2 font-semibold">발병 시기</th>
                    <th className="text-left px-3 py-2 font-semibold">악화 인자</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {symptoms.map((s) => (
                    <tr key={s.id}>
                      <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                        {BODY_PART_LABELS[s.bodyPart] ?? s.bodyPart}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <span
                          className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold"
                          style={{ backgroundColor: getPainLevelColor(s.painLevel) }}
                        >
                          {s.painLevel}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-700">{s.painType}</td>
                      <td className="px-3 py-2.5 text-gray-600">{s.onset}</td>
                      <td className="px-3 py-2.5 text-gray-600">{s.aggravation || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Patient memos per symptom */}
          {symptoms.some((s) => s.memo) && (
            <div className="mt-3 bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">환자 메모</h3>
              <div className="space-y-2">
                {symptoms.filter((s) => s.memo).map((s) => (
                  <div key={`memo-${s.id}`} className="text-sm text-gray-700 leading-relaxed">
                    <span className="font-semibold text-gray-900">{BODY_PART_LABELS[s.bodyPart] ?? s.bodyPart}:</span>{' '}
                    {s.memo}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pain level overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">통증 강도 분포</h3>
        <div className="space-y-2.5">
          {symptoms.map((s) => (
            <div key={`trend-${s.id}`} className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-700 w-28 shrink-0 truncate">
                {BODY_PART_LABELS[s.bodyPart] ?? s.bodyPart}
              </span>
              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getPainBarClass(s.painLevel)}`}
                  style={{ width: `${s.painLevel * 10}%` }}
                />
              </div>
              <span className="text-xs font-bold w-12 text-right" style={{ color: getPainLevelColor(s.painLevel) }}>
                {s.painLevel}/10
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-3">
          * 현재 단일 시점 기록입니다. 재방문 시 비교를 위해 기록이 누적됩니다.
        </p>
      </div>

      {/* Additional note from patient */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 print:break-inside-avoid">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">추가 전달 사항</h3>
        <p className="text-[11px] text-gray-400 mb-2">진료 시 의사에게 전달하고 싶은 내용을 작성하세요.</p>
        <textarea
          value={additionalNote}
          onChange={(e) => setAdditionalNote(e.target.value)}
          placeholder="예: 기존에 복용 중인 약, 과거 병력, 알레르기 등"
          rows={3}
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 resize-none transition-all"
        />
      </div>

      {/* Footer disclaimer */}
      <p className="text-[10px] text-gray-300 text-center print:text-gray-400">
        본 문진표는 환자가 직접 작성한 것으로, 의료 진단 자료가 아닌 참고용입니다. — MediTech
      </p>
    </div>
  );
}

/* ---------- Mini body map sub-component ---------- */

interface MiniBodyMapProps {
  side: 'front' | 'back';
  regions: { id: string; label: string; path: string; labelPos: { x: number; y: number } }[];
  outline: string;
  recordedParts: string[];
  symptoms: SymptomRecord[];
}

function MiniBodyMap({ side, regions, outline, recordedParts, symptoms }: MiniBodyMapProps) {
  const painMap = new Map(symptoms.map((s) => [s.bodyPart, s.painLevel]));

  return (
    <div className="w-36 md:w-44 flex flex-col items-center">
      <span className="text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">
        {side === 'front' ? '앞면' : '뒷면'}
      </span>
      <svg viewBox="0 0 300 545" className="w-full select-none">
        <path
          d={outline}
          fill={side === 'front' ? '#f8faf9' : '#f0f4ff'}
          stroke={side === 'front' ? '#d1d5db' : '#c7d2fe'}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {side === 'back' && (
          <path d="M150,100 L150,280" stroke="#c7d2fe" strokeWidth="1" strokeDasharray="4 3" fill="none" />
        )}
        {regions.map((region) => {
          const isRecorded = recordedParts.includes(region.id);
          return (
            <path
              key={region.id}
              d={region.path}
              fill={isRecorded ? 'rgba(239, 68, 68, 0.18)' : 'transparent'}
              stroke={isRecorded ? '#ef4444' : 'rgba(209,213,219,0.3)'}
              strokeWidth={isRecorded ? '1.5' : '0.6'}
            />
          );
        })}
        {recordedParts.map((partId) => {
          const region = regions.find((r) => r.id === partId);
          if (!region) return null;
          const level = painMap.get(partId) ?? 0;
          return (
            <g key={`dot-${partId}`}>
              <circle
                cx={region.labelPos.x}
                cy={region.labelPos.y}
                r="12"
                fill={getPainLevelColor(level)}
                opacity={0.25}
              />
              <circle
                cx={region.labelPos.x}
                cy={region.labelPos.y}
                r="6"
                fill={getPainLevelColor(level)}
                stroke="#fff"
                strokeWidth="1.5"
              />
              <text
                x={region.labelPos.x}
                y={region.labelPos.y + 3.5}
                textAnchor="middle"
                fontSize="7"
                fontWeight="bold"
                fill="#fff"
              >
                {level}
              </text>
            </g>
          );
        })}
        <text
          x="150" y="540" textAnchor="middle"
          fontSize="10" fill={side === 'front' ? '#c8d5cd' : '#c7d0e6'} fontWeight="500"
        >
          {side === 'front' ? 'FRONT' : 'BACK'}
        </text>
      </svg>
    </div>
  );
}
