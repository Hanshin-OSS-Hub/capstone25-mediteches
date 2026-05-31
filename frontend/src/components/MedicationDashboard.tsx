'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  searchMedicines,
  parsePrescription,
  ocrPrescription,
  generateMedicationGuide,
  type MedicineInfo,
  type ParsedMedication,
} from '@/lib/api';

interface Medication {
  id: number;
  name: string;
  start: number;
  interval: number;
  count: number;
  color: string;
  instructions?: string;
  taken?: boolean[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const STORAGE_KEY = 'mediteches_meds';

function formatHour(num: number) {
  const h = Math.floor(num);
  const m = num % 1 === 0.5 ? '30' : '00';
  return `${h < 10 ? '0' + h : h}:${m}`;
}

function getDoseTimes(m: Medication) {
  const times: number[] = [];
  for (let i = 0; i < m.count; i++) {
    const t = m.start + i * m.interval;
    if (t >= 24) break;
    times.push(t);
  }
  return times;
}

export default function MedicationDashboard() {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [inputName, setInputName] = useState('');
  const [inputStart, setInputStart] = useState(8);
  const [inputInterval, setInputInterval] = useState(6);
  const [inputCount, setInputCount] = useState(3);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchResults, setSearchResults] = useState<MedicineInfo[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [prescriptionText, setPrescriptionText] = useState('');
  const [aiGuide, setAiGuide] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');
  const [doctorContext, setDoctorContext] = useState('');
  const [postvisitSummary, setPostvisitSummary] = useState('');
  const notifiedRef = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setMeds(JSON.parse(saved));

    // 의사 설명 컨텍스트 로드
    const ctx = sessionStorage.getItem('meditech_doctor_context');
    if (ctx) { setDoctorContext(ctx); sessionStorage.removeItem('meditech_doctor_context'); }
    const summary = sessionStorage.getItem('meditech_postvisit_summary');
    if (summary) { setPostvisitSummary(summary); sessionStorage.removeItem('meditech_postvisit_summary'); }

    const pending = sessionStorage.getItem('meditech_pending_meds');
    if (pending) {
      try {
        const parsed = JSON.parse(pending) as ParsedMedication[];
        setMeds((prev) => [
          ...prev,
          ...parsed.map((p, i) => ({
            id: Date.now() + i,
            name: p.name,
            start: p.startHour,
            interval: p.intervalHours,
            count: p.doseCount,
            color: COLORS[(prev.length + i) % COLORS.length],
            instructions: p.instructions,
            taken: Array(p.doseCount).fill(false),
          })),
        ]);
        sessionStorage.removeItem('meditech_pending_meds');
      } catch { /* ignore */ }
    } else {
      const pendingText = sessionStorage.getItem('meditech_pending_prescription');
      if (pendingText) {
        setPrescriptionText(pendingText);
        sessionStorage.removeItem('meditech_pending_prescription');
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meds));
  }, [meds]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const nextDoseInfo = useMemo(() => {
    if (meds.length === 0) return null;
    const nowInMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const nowSec = currentTime.getSeconds();
    let minDiffInMinutes = Infinity;
    let nextMedNames: string[] = [];

    meds.forEach((m) => {
      getDoseTimes(m).forEach((doseTime) => {
        const doseInMinutes = doseTime * 60;
        const diff = doseInMinutes - nowInMinutes;
        if (diff > 0 && diff < minDiffInMinutes) {
          minDiffInMinutes = diff;
          nextMedNames = [m.name];
        } else if (diff > 0 && diff === minDiffInMinutes && !nextMedNames.includes(m.name)) {
          nextMedNames.push(m.name);
        }
      });
    });

    if (minDiffInMinutes === Infinity) return null;
    const totalSec = minDiffInMinutes * 60 - nowSec;
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const maxSec = minDiffInMinutes * 60;
    const ringProgress = Math.min(100, Math.max(0, ((maxSec - totalSec) / maxSec) * 100));
    const urgency: 'normal' | 'soon' | 'urgent' = minDiffInMinutes <= 15 ? 'urgent' : minDiffInMinutes <= 60 ? 'soon' : 'normal';

    return { name: nextMedNames.join(', '), h, m, s, ringProgress, urgency, minDiffInMinutes };
  }, [meds, currentTime]);

  useEffect(() => {
    if (!notificationsEnabled || !nextDoseInfo) return;
    if (nextDoseInfo.minDiffInMinutes <= 1) {
      const key = `${nextDoseInfo.name}-${currentTime.getHours()}:${currentTime.getMinutes()}`;
      if (!notifiedRef.current.has(key)) {
        notifiedRef.current.add(key);
        if (Notification.permission === 'granted') {
          new Notification('복약 알림', { body: `${nextDoseInfo.name} 복용 시간입니다.`, icon: '/favicon.ico' });
        }
      }
    }
  }, [currentTime, nextDoseInfo, notificationsEnabled]);

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotificationsEnabled(perm === 'granted');
  };

  const addMed = useCallback((partial?: Partial<Medication>) => {
    const name = partial?.name ?? inputName;
    if (!name) return;
    const count = partial?.count ?? inputCount;
    const newMed: Medication = {
      id: Date.now(),
      name,
      start: partial?.start ?? inputStart,
      interval: partial?.interval ?? inputInterval,
      count,
      color: partial?.color ?? COLORS[meds.length % COLORS.length],
      instructions: partial?.instructions,
      taken: Array(count).fill(false),
    };
    setMeds((prev) => [...prev, newMed]);
    setInputName('');
    setSearchOpen(false);
    setSearchResults([]);
  }, [inputName, inputStart, inputInterval, inputCount, meds.length]);

  const toggleTaken = (medId: number, doseIdx: number) => {
    setMeds((prev) => prev.map((m) => {
      if (m.id !== medId) return m;
      const taken = [...(m.taken ?? Array(m.count).fill(false))];
      taken[doseIdx] = !taken[doseIdx];
      return { ...m, taken };
    }));
  };

  const handleNameChange = (value: string) => {
    setInputName(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.trim().length < 2) { setSearchResults([]); setSearchOpen(false); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await searchMedicines(value.trim());
        setSearchResults(results.slice(0, 5));
        setSearchOpen(results.length > 0);
      } catch { setSearchResults([]); }
    }, 300);
  };

  const handleAiParse = async () => {
    if (!prescriptionText.trim()) return;
    setAiLoading(true);
    setAiGuide('');
    try {
      const { medications } = await parsePrescription(prescriptionText);
      if (medications.length === 0) {
        setAiGuide('처방 내용을 인식하지 못했습니다. 약 이름과 복용 횟수를 포함해 다시 입력해 주세요.');
        return;
      }
      medications.forEach((m, i) => {
        addMed({ name: m.name, start: m.startHour, interval: m.intervalHours, count: m.doseCount, instructions: m.instructions, color: COLORS[(meds.length + i) % COLORS.length] });
      });
      const { guide } = await generateMedicationGuide(medications);
      setAiGuide(guide);
      setPrescriptionText('');
    } catch (err) {
      setAiGuide(`분석 중 오류가 발생했습니다: ${err instanceof Error ? err.message : '서버에 연결할 수 없습니다.'}\n\n직접 등록 탭에서 수동으로 등록할 수 있습니다.`);
    } finally { setAiLoading(false); }
  };

  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { text, medications } = await ocrPrescription(base64);
      setPrescriptionText(text);
      if (medications.length > 0) {
        medications.forEach((m, i) => {
          addMed({ name: m.name, start: m.startHour, interval: m.intervalHours, count: m.doseCount, instructions: m.instructions, color: COLORS[(meds.length + i) % COLORS.length] });
        });
      }
    } catch (err) { alert(err instanceof Error ? err.message : 'OCR 실패'); }
    finally { setOcrLoading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const nowHour = currentTime.getHours() + currentTime.getMinutes() / 60;

  return (
    <div className="w-full max-w-4xl mx-auto pb-24 px-4 sm:px-6">
      {/* ═══ Hero countdown ═══ */}
      <section className="relative rounded-3xl overflow-hidden mb-8">
        <div className={`absolute inset-0 bg-gradient-to-br ${nextDoseInfo ? (nextDoseInfo.urgency === 'urgent' ? 'from-red-500 to-rose-600' : nextDoseInfo.urgency === 'soon' ? 'from-amber-500 to-orange-500' : 'from-emerald-500 to-teal-600') : 'from-slate-400 to-slate-500'}`} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="relative z-10 px-6 sm:px-8 py-8 sm:py-10">
          <div className="flex items-center gap-6 sm:gap-10">
            {/* Ring */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
                {nextDoseInfo && (
                  <circle cx="50" cy="50" r="42" fill="none" stroke="white" strokeWidth="6" strokeDasharray={`${nextDoseInfo.ringProgress * 2.64} 264`} strokeLinecap="round" className="transition-all duration-1000" />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {nextDoseInfo ? (
                  <>
                    <span className="text-white/60 text-[10px] font-medium">남은 시간</span>
                    <span className="text-white text-lg sm:text-xl font-bold tabular-nums">{nextDoseInfo.h > 0 ? `${nextDoseInfo.h}h` : ''}{nextDoseInfo.m}m</span>
                  </>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white/60"><path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {nextDoseInfo ? (
                <>
                  <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">다음 복용까지</p>
                  <p className="text-white text-3xl sm:text-4xl font-bold tabular-nums tracking-tight">
                    {nextDoseInfo.h > 0 && <><span>{nextDoseInfo.h}</span><span className="text-white/50 text-lg">시간 </span></>}
                    <span>{nextDoseInfo.m}</span><span className="text-white/50 text-lg">분 </span>
                    <span>{nextDoseInfo.s}</span><span className="text-white/50 text-lg">초</span>
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />
                    <p className="text-white/90 text-sm font-medium truncate">{nextDoseInfo.name}</p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2">복약 완료</p>
                  <p className="text-white text-xl font-semibold">오늘 남은 복약이 없습니다</p>
                </>
              )}
            </div>
          </div>

          {/* Bottom row */}
          <div className="mt-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {meds.length > 0 && (
                <div className="flex -space-x-1">
                  {meds.slice(0, 5).map((m) => (
                    <span key={m.id} className="w-5 h-5 rounded-full border-2 border-white/30" style={{ backgroundColor: m.color }} />
                  ))}
                  {meds.length > 5 && <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[9px] text-white font-bold">+{meds.length - 5}</span>}
                </div>
              )}
              <span className="text-white/50 text-xs">{meds.length}종 등록</span>
            </div>
            {!notificationsEnabled && (
              <button onClick={handleEnableNotifications} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 text-xs font-medium transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /></svg>
                알림 켜기
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ═══ Doctor context (from postvisit) ═══ */}
      {(doctorContext || postvisitSummary) && (
        <section className="rounded-2xl bg-white border border-indigo-100 shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-3 bg-indigo-50/50 border-b border-indigo-100 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-indigo-500"><path d="M9 12h6M12 9v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" /></svg>
            <h3 className="text-sm font-semibold text-indigo-700">진료 연동 정보</h3>
            <button onClick={() => { setDoctorContext(''); setPostvisitSummary(''); }} className="ml-auto text-xs text-gray-400 hover:text-gray-600">닫기</button>
          </div>
          <div className="p-4 space-y-3">
            {doctorContext && (
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">의사 설명</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg px-3 py-2 max-h-32 overflow-y-auto">{doctorContext}</p>
              </div>
            )}
            {postvisitSummary && (
              <details className="rounded-lg bg-gray-50 overflow-hidden">
                <summary className="px-3 py-2 text-[11px] font-semibold text-indigo-600 cursor-pointer hover:bg-indigo-50/50">AI 정리 요약 보기</summary>
                <div className="px-3 pb-3">
                  <pre className="whitespace-pre-wrap text-xs text-gray-600 leading-relaxed font-sans max-h-48 overflow-y-auto">{postvisitSummary}</pre>
                </div>
              </details>
            )}
          </div>
        </section>
      )}

      {/* ═══ Add medication ═══ */}
      <section className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden mb-6">
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button onClick={() => setActiveTab('ai')} className={`flex-1 py-3.5 text-sm font-medium transition-colors ${activeTab === 'ai' ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/30' : 'text-gray-400 hover:text-gray-600'}`}>
            <span className="flex items-center justify-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7l3-7z" /></svg>
              AI 입력
            </span>
          </button>
          <button onClick={() => setActiveTab('manual')} className={`flex-1 py-3.5 text-sm font-medium transition-colors ${activeTab === 'manual' ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/30' : 'text-gray-400 hover:text-gray-600'}`}>
            <span className="flex items-center justify-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
              직접 등록
            </span>
          </button>
        </div>

        {/* AI Tab */}
        {activeTab === 'ai' && (
          <div className="p-5 sm:p-6 space-y-4">
            <textarea
              value={prescriptionText}
              onChange={(e) => setPrescriptionText(e.target.value)}
              placeholder="처방 내용을 붙여넣기 하세요&#10;예: 아목시실린 500mg 1일 3회 식후 30분"
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm placeholder-gray-300 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 resize-none transition-all"
            />
            <div className="flex gap-2">
              <button onClick={handleAiParse} disabled={aiLoading || !prescriptionText.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
                {aiLoading ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />분석 중...</>) : (<><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7l3-7z" /></svg>AI 스케줄 생성</>)}
              </button>
              <label className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all">
                {ocrLoading ? <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                처방전 넣기
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleOcrUpload} />
              </label>
            </div>
            {aiGuide && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 space-y-2">
                <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 5 5L20 7" /></svg>
                  AI 복약 가이드
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{aiGuide}</p>
              </div>
            )}
          </div>
        )}

        {/* Manual Tab */}
        {activeTab === 'manual' && (
          <div className="p-5 sm:p-6 space-y-5">
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" /></svg>
              </div>
              <input
                type="text"
                value={inputName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="약 이름 검색 또는 직접 입력"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-4 py-3 text-sm placeholder-gray-300 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all"
              />
              {searchOpen && searchResults.length > 0 && (
                <ul className="absolute z-10 mt-1.5 w-full rounded-xl border border-gray-200 bg-white shadow-xl divide-y divide-gray-50 overflow-hidden">
                  {searchResults.map((m) => (
                    <li key={m.name}>
                      <button type="button" onClick={() => { setInputName(m.name); setSearchOpen(false); }}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-emerald-50/50 transition-colors flex items-center justify-between">
                        <span className="font-medium text-gray-800">{m.name}</span>
                        <span className="text-gray-300 text-xs">{m.company}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">첫 복용</span>
                  <span className="text-xs font-semibold text-gray-700 tabular-nums">{formatHour(inputStart)}</span>
                </div>
                <input type="range" min="0" max="23.5" step="0.5" value={inputStart} onChange={(e) => setInputStart(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none bg-gray-200 accent-emerald-500 cursor-pointer" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">간격</span>
                  <span className="text-xs font-semibold text-gray-700 tabular-nums">{inputInterval}시간</span>
                </div>
                <input type="range" min="1" max="12" value={inputInterval} onChange={(e) => setInputInterval(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none bg-gray-200 accent-emerald-500 cursor-pointer" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">횟수</span>
                  <span className="text-xs font-semibold text-gray-700 tabular-nums">{inputCount}회/일</span>
                </div>
                <input type="range" min="1" max="10" value={inputCount} onChange={(e) => setInputCount(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none bg-gray-200 accent-emerald-500 cursor-pointer" />
              </div>
            </div>

            <button onClick={() => addMed()} disabled={!inputName.trim()}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
              스케줄 등록
            </button>
          </div>
        )}
      </section>

      {/* ═══ Medication cards ═══ */}
      {meds.length > 0 && (
        <section className="mb-6 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-gray-800">내 약 목록</h2>
            <span className="text-xs text-gray-400">{meds.length}종</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {meds.map((m) => {
              const doses = getDoseTimes(m);
              const taken = m.taken ?? Array(m.count).fill(false);
              const takenCount = taken.filter(Boolean).length;
              return (
                <div key={m.id} className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-3 h-3 rounded-full shrink-0 ring-4 ring-opacity-20" style={{ backgroundColor: m.color, boxShadow: `0 0 0 4px ${m.color}20` }} />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{m.name}</p>
                        <p className="text-[11px] text-gray-400">{formatHour(m.start)} 시작 · {m.interval}h 간격</p>
                      </div>
                    </div>
                    <button onClick={() => setMeds(meds.filter((x) => x.id !== m.id))} className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors" aria-label="삭제">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>

                  {m.instructions && <p className="text-[11px] text-emerald-600 bg-emerald-50 rounded-lg px-2.5 py-1 mb-3 inline-block">{m.instructions}</p>}

                  {/* Dose chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {doses.map((t, idx) => (
                      <button key={idx} onClick={() => toggleTaken(m.id, idx)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${taken[idx] ? 'bg-gray-100 text-gray-400 line-through' : 'border text-gray-700 hover:border-emerald-300 hover:bg-emerald-50'}`}
                        style={!taken[idx] ? { borderColor: `${m.color}40` } : undefined}>
                        {formatHour(t)}
                        {taken[idx] && <span className="ml-1">✓</span>}
                      </button>
                    ))}
                  </div>

                  {/* Progress */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(takenCount / doses.length) * 100}%`, backgroundColor: m.color }} />
                    </div>
                    <span className="text-[10px] text-gray-400 tabular-nums">{takenCount}/{doses.length}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══ 24h visual timeline ═══ */}
      {meds.length > 0 && (
        <section className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-800">오늘 타임라인</h2>
            <span className="text-[11px] text-gray-400 tabular-nums">
              {currentTime.getHours().toString().padStart(2, '0')}:{currentTime.getMinutes().toString().padStart(2, '0')}
            </span>
          </div>
          <div className="p-5">
            {/* Visual bar */}
            <div className="relative h-14 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden mb-4">
              {/* Current time indicator */}
              <div className="absolute top-0 bottom-0 w-px bg-red-400 z-10" style={{ left: `${(nowHour / 24) * 100}%` }}>
                <div className="absolute -top-0.5 -left-1 w-2 h-2 rounded-full bg-red-400" />
              </div>

              {/* Dose markers */}
              {meds.map((m) =>
                getDoseTimes(m).map((t, i) => (
                  <div key={`${m.id}-${i}`} className="absolute top-2 bottom-2 w-1 rounded-full opacity-80" style={{ left: `${(t / 24) * 100}%`, backgroundColor: m.color }} />
                ))
              )}

              {/* Hour labels */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-[9px] text-gray-300">
                {[0, 6, 12, 18].map((h) => <span key={h} className="tabular-nums">{h}:00</span>)}
                <span className="tabular-nums">24:00</span>
              </div>
            </div>

            {/* Detailed list */}
            <div className="space-y-1">
              {Array.from({ length: 24 }).map((_, hour) => {
                const items: { name: string; color: string; time: number }[] = [];
                meds.forEach((m) => getDoseTimes(m).forEach((t) => { if (Math.floor(t) === hour) items.push({ name: m.name, color: m.color, time: t }); }));
                if (items.length === 0) return null;
                const isPast = hour < currentTime.getHours();
                return (
                  <div key={hour} className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors ${isPast ? 'opacity-40' : 'hover:bg-gray-50'}`}>
                    <span className="w-12 text-xs font-mono text-gray-400 tabular-nums shrink-0">{String(hour).padStart(2, '0')}:00</span>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((item, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ color: item.color, backgroundColor: `${item.color}10`, border: `1px solid ${item.color}25` }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                          {item.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Empty state */}
      {meds.length === 0 && (
        <section className="rounded-2xl bg-white border border-dashed border-gray-200 p-10 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-emerald-400">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">등록된 약이 없습니다</p>
          <p className="text-gray-400 text-xs mt-1">위에서 AI 입력 또는 직접 등록으로 약을 추가하세요</p>
        </section>
      )}

      <p className="text-[10px] text-gray-300 text-center mt-8">본 정보는 의료 전문가의 처방을 대체할 수 없습니다.</p>
    </div>
  );
}
