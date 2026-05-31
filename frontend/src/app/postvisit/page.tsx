'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { simplifyExplanation, searchMedicines, parsePrescription, type MedicineInfo } from '@/lib/api';
import PostvisitPhaseTabs from '@/components/postvisit/PostvisitPhaseTabs';

/* ─── Highlight ─── */
type HighlightLevel = 'yellow' | 'orange' | 'green';
interface HighlightSegment { type: 'text' | 'highlight'; text: string; level?: HighlightLevel; caption?: string; }

function parseHighlights(raw: string): HighlightSegment[] {
  const regex = /\{\{(yellow|orange|green)\|([^|]+)\|([^}]+)\}\}/g;
  const segments: HighlightSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) segments.push({ type: 'text', text: raw.slice(lastIndex, match.index) });
    segments.push({ type: 'highlight', text: match[2], level: match[1] as HighlightLevel, caption: match[3] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < raw.length) segments.push({ type: 'text', text: raw.slice(lastIndex) });
  return segments;
}

function HighlightedText({ segments }: { segments: HighlightSegment[] }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const triggerRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (activeIdx === null) return;
    const currentIdx = activeIdx;
    function handleOutsideClick(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        const trigger = triggerRefs.current.get(currentIdx);
        if (trigger && trigger.contains(e.target as Node)) return;
        setActiveIdx(null);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [activeIdx]);

  const openTooltip = useCallback((idx: number) => {
    if (activeIdx === idx) { setActiveIdx(null); return; }
    const el = triggerRefs.current.get(idx);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const tooltipW = 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    let left = rect.left + rect.width / 2 - tooltipW / 2;
    if (left < 8) left = 8;
    if (left + tooltipW > window.innerWidth - 8) left = window.innerWidth - tooltipW - 8;
    setTooltipStyle({
      position: 'fixed', left: `${left}px`, width: `${tooltipW}px`, zIndex: 99999,
      ...(spaceBelow < 150 ? { bottom: `${window.innerHeight - rect.top + 8}px` } : { top: `${rect.bottom + 8}px` }),
    });
    setActiveIdx(idx);
  }, [activeIdx]);

  const seg = activeIdx !== null ? segments[activeIdx] : null;
  const borderCls = seg?.level === 'yellow' ? 'border-yellow-400' : seg?.level === 'green' ? 'border-emerald-400' : 'border-orange-400';
  const dotCls = seg?.level === 'yellow' ? 'bg-yellow-400' : seg?.level === 'green' ? 'bg-emerald-500' : 'bg-orange-500';
  const labelTxt = seg?.level === 'yellow' ? '주의' : seg?.level === 'green' ? '용어 설명' : '꼭 지켜야 함';

  const tooltip = activeIdx !== null && seg && mounted ? createPortal(
    <div ref={tooltipRef} className={`rounded-xl shadow-xl border-2 ${borderCls} bg-white p-4 text-sm text-gray-700 leading-relaxed animate-in fade-in zoom-in-95 duration-150`} style={tooltipStyle}>
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
          <span className={`w-2.5 h-2.5 rounded-full ${dotCls}`} />
          {labelTxt}
        </span>
        <button onClick={(e) => { e.stopPropagation(); setActiveIdx(null); }} className="text-gray-400 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 transition-colors" aria-label="닫기">
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      </div>
      <p className="text-gray-600 leading-relaxed">{seg.caption}</p>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      {segments.map((s, i) => {
        if (s.type === 'text') return <span key={i}>{s.text}</span>;
        const bg = s.level === 'yellow' ? 'bg-yellow-200/70 hover:bg-yellow-300/80' : s.level === 'green' ? 'bg-emerald-200/70 hover:bg-emerald-300/80' : 'bg-orange-200/70 hover:bg-orange-300/80';
        return (
          <span key={i} ref={(el) => { if (el) triggerRefs.current.set(i, el); }} role="button" tabIndex={0}
            onClick={(e) => { e.stopPropagation(); openTooltip(i); }} onKeyDown={(e) => e.key === 'Enter' && openTooltip(i)}
            className={`${bg} rounded px-0.5 cursor-pointer transition-colors underline decoration-dotted decoration-1 underline-offset-2`}>{s.text}</span>
        );
      })}
      {tooltip}
    </>
  );
}

/* ─── Section config ─── */
const SECTION_CONFIG: { key: string; label: string; color: string; iconPath: string }[] = [
  { key: '쉽게 풀어본 설명', label: '쉽게 풀어본 설명', color: 'text-indigo-500 bg-indigo-50 border-indigo-100', iconPath: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25' },
  { key: '집에서 이렇게 관리하세요', label: '집에서 이렇게 관리하세요', color: 'text-emerald-500 bg-emerald-50 border-emerald-100', iconPath: 'M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25' },
  { key: '이런 음식/음료는 피하세요', label: '이런 음식/음료는 피하세요', color: 'text-orange-500 bg-orange-50 border-orange-100', iconPath: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' },
  { key: '같이 먹으면 안 되는 약', label: '같이 먹으면 안 되는 약', color: 'text-red-500 bg-red-50 border-red-100', iconPath: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z' },
  { key: '다시 병원에 가야 할 때', label: '다시 병원에 가야 할 때', color: 'text-blue-500 bg-blue-50 border-blue-100', iconPath: 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z' },
];

function extractSection(text: string, sectionName: string): string | null {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
  const pattern = new RegExp(`(?:^|\\n)#+\\s*${escaped}[\\s]*\\n([\\s\\S]*?)(?=\\n#+\\s|$)`, 'i');
  const match = text.match(pattern);
  return match?.[1]?.trim() || null;
}

/* ─── Speech ─── */
interface SpeechRecognitionEvent { resultIndex: number; results: SpeechRecognitionResultList; }
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean; interimResults: boolean; lang: string;
  start(): void; stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;
function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as SpeechRecognitionConstructor | null;
}

/* ─── Main ─── */
type Phase = 'during' | 'after';

export default function PostVisitPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('during');

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [doctorExplanation, setDoctorExplanation] = useState('');
  const [prescriptions, setPrescriptions] = useState('');
  const [precautions, setPrecautions] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoSentToMed, setAutoSentToMed] = useState(false);

  const [medicineName, setMedicineName] = useState('');
  const [medicineResults, setMedicineResults] = useState<MedicineInfo[]>([]);
  const [expandedMedicine, setExpandedMedicine] = useState<string | null>(null);
  const [medicineLoading, setMedicineLoading] = useState(false);
  const [medicineError, setMedicineError] = useState('');

  const resultsPanelRef = useRef<HTMLDivElement>(null);

  // Restore saved data from localStorage
  useEffect(() => {
    if (!getSpeechRecognition()) setSpeechSupported(false);
    try {
      const saved = localStorage.getItem('meditech_postvisit');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.doctorExplanation) setDoctorExplanation(data.doctorExplanation);
        if (data.prescriptions) setPrescriptions(data.prescriptions);
        if (data.precautions) setPrecautions(data.precautions);
        if (data.result) setResult(data.result);
        if (data.autoSentToMed) setAutoSentToMed(true);
        if (data.phase) setPhase(data.phase);
      }
    } catch { /* */ }
  }, []);

  // Persist form data to localStorage
  useEffect(() => {
    const data = { doctorExplanation, prescriptions, precautions, result, autoSentToMed, phase };
    localStorage.setItem('meditech_postvisit', JSON.stringify(data));
  }, [doctorExplanation, prescriptions, precautions, result, autoSentToMed, phase]);

  const startRecording = useCallback(() => {
    const SRConstructor = getSpeechRecognition();
    if (!SRConstructor) { setSpeechSupported(false); return; }
    const recognition = new SRConstructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ko-KR';
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let newFinal = '', interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) newFinal += r[0].transcript + ' ';
        else interim += r[0].transcript;
      }
      if (newFinal) setTranscript((prev) => prev + newFinal);
      setInterimText(interim);
    };
    recognition.onerror = (event: { error: string }) => { if (event.error === 'not-allowed') setSpeechSupported(false); };
    recognition.onend = () => { if (recognitionRef.current) { try { recognitionRef.current.start(); } catch { /* */ } } };
    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
    setRecordingSeconds(0);
    timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) { const ref = recognitionRef.current; recognitionRef.current = null; ref.onend = null; ref.stop(); }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setIsRecording(false);
    const finalTranscript = (transcript + ' ' + interimText).trim();
    if (finalTranscript) setDoctorExplanation(finalTranscript);
    setInterimText('');
    setPhase('after');
  }, [transcript, interimText]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult('');

    const combined = [
      doctorExplanation && `[의사 설명]\n${doctorExplanation}`,
      prescriptions && `[처방 약]\n${prescriptions}`,
      precautions && `[주의사항]\n${precautions}`,
    ].filter(Boolean).join('\n\n');

    if (!combined.trim()) { setError('최소 하나의 항목을 입력해 주세요.'); setLoading(false); return; }

    try {
      const { simplified } = await simplifyExplanation(combined);
      setResult(simplified);

      const rxText = prescriptions.trim() || doctorExplanation.trim();
      if (rxText) {
        try {
          const { medications } = await parsePrescription(rxText);
          if (medications.length > 0) {
            sessionStorage.setItem('meditech_pending_meds', JSON.stringify(medications));
            setAutoSentToMed(true);
          }
        } catch { /* */ }
      }

      setTimeout(() => resultsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function handleGoToMedication() {
    if (!autoSentToMed) {
      const text = prescriptions.trim() || doctorExplanation.trim();
      if (text) sessionStorage.setItem('meditech_pending_prescription', text);
    }
    // 의사 설명 컨텍스트를 복약 타이머에 전달
    if (doctorExplanation.trim()) {
      sessionStorage.setItem('meditech_doctor_context', doctorExplanation.trim());
    }
    if (result) {
      sessionStorage.setItem('meditech_postvisit_summary', result);
    }
    router.push('/medication');
  }

  async function handleMedicineSearch() {
    if (!medicineName.trim()) return;
    setMedicineLoading(true); setMedicineError(''); setMedicineResults([]); setExpandedMedicine(null);
    try {
      const results = await searchMedicines(medicineName.trim());
      if (results.length === 0) setMedicineError('검색 결과가 없습니다.');
      else setMedicineResults(results);
    } catch (err) { setMedicineError(err instanceof Error ? err.message : '약 정보를 불러올 수 없습니다.'); }
    finally { setMedicineLoading(false); }
  }

  const hasSections = SECTION_CONFIG.some((s) => extractSection(result, s.key));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors mb-2 inline-flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            홈으로
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">진료 기록</h1>
          <p className="text-sm text-gray-500 mt-1">녹음 → 입력 → 오른쪽에 정리 결과가 나타납니다</p>
        </div>

        <PostvisitPhaseTabs phase={phase} isRecording={isRecording} onPhaseChange={setPhase} />

        {/* ═══ 진료 중 ═══ */}
        {phase === 'during' && (
          <div className="max-w-xl mx-auto">
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-50 bg-gradient-to-r from-emerald-50/50 to-transparent">
                <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-emerald-600">
                      <path d="M12 2a4 4 0 00-4 4v5a4 4 0 008 0V6a4 4 0 00-4-4z" fill="currentColor" />
                      <path d="M19 11a7 7 0 01-14 0M12 18v4m-3 0h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                  진료 녹음
                </h2>
                <p className="text-xs text-gray-400 mt-1 ml-10">
                  의사의 말이 자동으로 텍스트로 변환됩니다{!speechSupported && ' (Chrome 권장)'}
                </p>
              </div>

              <div className="px-6 py-10 flex flex-col items-center">
                {isRecording && (
                  <div className="mb-8 text-center">
                    <p className="text-4xl font-mono font-light text-gray-700 tracking-wider">{formatTime(recordingSeconds)}</p>
                    <div className="flex items-center justify-center gap-1.5 mt-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs text-red-500 font-medium">녹음 중</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!speechSupported}
                  className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed ${isRecording ? 'bg-red-500 hover:bg-red-600 shadow-xl shadow-red-200/50 scale-105' : 'bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-200/50 hover:scale-105'}`}
                >
                  {isRecording
                    ? <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                    : <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-white"><path d="M12 2a4 4 0 00-4 4v5a4 4 0 008 0V6a4 4 0 00-4-4z" fill="currentColor" /><path d="M19 11a7 7 0 01-14 0M12 18v4m-3 0h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  }
                </button>
                <p className="text-xs text-gray-400 mt-5">{isRecording ? '진료 끝나면 ■ 눌러 종료' : '버튼을 눌러 녹음 시작'}</p>
              </div>

              {(transcript || interimText) && (
                <div className="px-6 pb-6">
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 max-h-48 overflow-y-auto">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">실시간 변환</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{transcript}{interimText && <span className="text-gray-400 italic">{interimText}</span>}</p>
                  </div>
                </div>
              )}

              {!isRecording && (
                <div className="px-6 pb-5 border-t border-gray-50 pt-4 text-center">
                  <button onClick={() => setPhase('after')} className="text-xs text-gray-400 hover:text-emerald-600 transition-colors">녹음 없이 직접 입력 →</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ 진료 후: 왼쪽 입력 + 오른쪽 결과 슬라이드 ═══ */}
        {phase === 'after' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left: Input */}
            <div className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <span className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-indigo-500"><path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></span>
                    의사가 한 설명
                  </label>
                  <textarea rows={4} value={doctorExplanation} onChange={(e) => setDoctorExplanation(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 resize-none transition-all"
                    placeholder="진료 중 들은 설명을 적어주세요..." />
                  {transcript && <p className="text-[10px] text-emerald-500 mt-1.5">녹음 내용이 자동 입력됨</p>}
                </div>

                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-emerald-500"><path d="M9 12h6M12 9v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" /></svg></span>
                    처방받은 약
                    <span className="text-[10px] text-gray-400 font-normal ml-auto">→ 복약 타이머 자동 연동</span>
                  </label>
                  <input type="text" value={prescriptions} onChange={(e) => setPrescriptions(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition-all"
                    placeholder="예: 타이레놀 500mg 1일 3회, 아목시실린 1일 2회" />
                </div>

                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <span className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-orange-500"><path d="M12 9v4m0 4h.01M12 2L2 20h20L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                    주의사항
                  </label>
                  <textarea rows={2} value={precautions} onChange={(e) => setPrecautions(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 resize-none transition-all"
                    placeholder="기억나는 주의사항" />
                </div>

                {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5 border border-red-100">{error}</p>}

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />정리하는 중...</>) : (<><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7l3-7z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" /></svg>AI로 쉽게 정리하기</>)}
                </button>
              </form>

              {/* Medicine search */}
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-blue-500"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" /><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span>
                  약 정보 검색
                </h3>
                <div className="flex gap-2">
                  <input type="text" value={medicineName} onChange={(e) => setMedicineName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleMedicineSearch()}
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all" placeholder="약 이름" />
                  <button type="button" onClick={handleMedicineSearch} disabled={medicineLoading || !medicineName.trim()} className="px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50">{medicineLoading ? '...' : '검색'}</button>
                </div>
                {medicineError && <p className="mt-2 text-xs text-red-500">{medicineError}</p>}
                {medicineResults.length > 0 && (
                  <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
                    {medicineResults.map((med) => (
                      <div key={med.name} className="rounded-lg border border-gray-100 overflow-hidden">
                        <button type="button" onClick={() => setExpandedMedicine(expandedMedicine === med.name ? null : med.name)} className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm transition-colors ${expandedMedicine === med.name ? 'bg-blue-50 text-blue-700 font-semibold' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 font-medium'}`}>
                          <span className="truncate">{med.name}</span>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`shrink-0 transition-transform ${expandedMedicine === med.name ? 'rotate-180' : ''}`}><path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                        </button>
                        {expandedMedicine === med.name && (
                          <div className="px-3 py-2.5 bg-white border-t border-gray-100 space-y-1.5 text-xs text-gray-600">
                            {med.company && <p className="text-gray-400">제조사: {med.company}</p>}
                            {med.category && <p><span className="font-semibold text-indigo-600">분류:</span> {med.category}</p>}
                            {med.ingredients && <p><span className="font-semibold text-emerald-600">성분:</span> {med.ingredients}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={() => setPhase('during')} className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">← 다시 녹음하기</button>
            </div>

            {/* Right: Results panel — slides in */}
            <div
              ref={resultsPanelRef}
              className={`transition-all duration-500 ease-out lg:sticky lg:top-8 ${result || loading ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8 pointer-events-none lg:hidden'}`}
            >
              {loading && (
                <div className="rounded-2xl bg-white border border-emerald-100 shadow-sm p-10">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative w-12 h-12 mb-4">
                      <div className="absolute inset-0 rounded-full border-[3px] border-emerald-100" />
                      <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-emerald-500 animate-spin" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">정리 중...</p>
                    <p className="text-xs text-gray-400 mt-1">이해하기 쉬운 형태로 변환합니다</p>
                  </div>
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  {/* Auto-med notice */}
                  {autoSentToMed && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-3">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-emerald-600 shrink-0"><path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <p className="text-xs text-emerald-700"><span className="font-semibold">처방약 자동 감지</span> — 복약 타이머에 준비됨</p>
                    </div>
                  )}

                  {/* Legend */}
                  {hasSections && (
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-emerald-200/80" />용어</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-yellow-200/80" />주의</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-orange-200/80" />필수</span>
                    </div>
                  )}

                  {/* Sections */}
                  {hasSections ? (
                    SECTION_CONFIG.map((section) => {
                      const content = extractSection(result, section.key);
                      if (!content) return null;
                      const [textColor, bgColor, borderColor] = section.color.split(' ');
                      return (
                        <div key={section.key} className={`rounded-2xl bg-white border shadow-sm overflow-hidden ${borderColor}`}>
                          <div className={`flex items-center gap-2 px-4 py-2.5 ${bgColor} border-b ${borderColor}`}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={textColor}><path d={section.iconPath} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            <h3 className={`text-xs font-semibold ${textColor}`}>{section.label}</h3>
                          </div>
                          <div className="px-4 py-3"><div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap"><HighlightedText segments={parseHighlights(content)} /></div></div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
                      <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap"><HighlightedText segments={parseHighlights(result)} /></div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={handleGoToMedication}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow-sm transition-all">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                      복약 타이머
                    </button>
                    <button onClick={() => { setResult(''); setAutoSentToMed(false); }} className="px-4 py-3 rounded-2xl border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors">다시</button>
                  </div>

                  <details className="rounded-xl bg-gray-50 border border-gray-100 overflow-hidden">
                    <summary className="px-4 py-2 text-[10px] text-gray-400 cursor-pointer hover:text-gray-600">원문 보기</summary>
                    <div className="px-4 pb-3"><pre className="whitespace-pre-wrap text-[11px] text-gray-500 leading-relaxed font-sans">{result}</pre></div>
                  </details>
                </div>
              )}

              {!result && !loading && (
                <div className="hidden lg:flex rounded-2xl bg-white/60 border border-dashed border-gray-200 p-10 flex-col items-center text-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-gray-300 mb-3"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  <p className="text-sm text-gray-400">왼쪽에서 입력 후</p>
                  <p className="text-sm text-gray-400">"AI로 쉽게 정리하기"를 누르면</p>
                  <p className="text-sm text-gray-400">여기에 결과가 나타납니다</p>
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-[10px] text-gray-300 text-center mt-10">본 정보는 의료 전문가의 진단을 대체할 수 없습니다.</p>
      </div>
    </div>
  );
}
