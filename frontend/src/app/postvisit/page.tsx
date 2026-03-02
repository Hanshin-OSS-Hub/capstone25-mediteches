'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { simplifyExplanation, getMedicineInfo } from '@/lib/api';

/* ─── Highlight marker types ─── */
type HighlightLevel = 'yellow' | 'orange' | 'green';

interface HighlightSegment {
  type: 'text' | 'highlight';
  text: string;
  level?: HighlightLevel;
  caption?: string;
}

function parseHighlights(raw: string): HighlightSegment[] {
  const regex = /\{\{(yellow|orange|green)\|([^|]+)\|([^}]+)\}\}/g;
  const segments: HighlightSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: raw.slice(lastIndex, match.index) });
    }
    segments.push({
      type: 'highlight',
      text: match[2],
      level: match[1] as HighlightLevel,
      caption: match[3],
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < raw.length) {
    segments.push({ type: 'text', text: raw.slice(lastIndex) });
  }

  return segments;
}

/* ─── Highlight span component ─── */
function HighlightedText({ segments }: { segments: HighlightSegment[] }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const triggerRefs = useRef<Map<number, HTMLSpanElement>>(new Map());
  const tooltipRef = useRef<HTMLSpanElement>(null);

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
    const tooltipH = 120;
    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < tooltipH + 16;

    let left = rect.left + rect.width / 2 - tooltipW / 2;
    if (left < 8) left = 8;
    if (left + tooltipW > window.innerWidth - 8) left = window.innerWidth - tooltipW - 8;

    setTooltipStyle({
      position: 'fixed',
      left: `${left}px`,
      width: `${tooltipW}px`,
      ...(showAbove
        ? { bottom: `${window.innerHeight - rect.top + 8}px` }
        : { top: `${rect.bottom + 8}px` }),
    });
    setActiveIdx(idx);
  }, [activeIdx]);

  const activeSegment = activeIdx !== null ? segments[activeIdx] : null;
  const activeLevel = activeSegment?.level;
  const activeBorderClass = activeLevel === 'yellow' ? 'border-yellow-400' : activeLevel === 'green' ? 'border-emerald-400' : 'border-orange-400';
  const activeDotClass = activeLevel === 'yellow' ? 'bg-yellow-400' : activeLevel === 'green' ? 'bg-emerald-500' : 'bg-orange-500';
  const activeLabelText = activeLevel === 'yellow' ? '주의' : activeLevel === 'green' ? '용어 설명' : '꼭 지켜야 함';

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <span key={i}>{seg.text}</span>;
        }

        const bgClass = seg.level === 'yellow'
          ? 'bg-yellow-200/70 hover:bg-yellow-300/80'
          : seg.level === 'green'
            ? 'bg-emerald-200/70 hover:bg-emerald-300/80'
            : 'bg-orange-200/70 hover:bg-orange-300/80';

        return (
          <span
            key={i}
            ref={(el) => { if (el) triggerRefs.current.set(i, el); }}
            role="button"
            tabIndex={0}
            onClick={() => openTooltip(i)}
            onKeyDown={(e) => e.key === 'Enter' && openTooltip(i)}
            className={`
              ${bgClass} rounded px-0.5 cursor-pointer transition-colors duration-150
              underline decoration-dotted decoration-1 underline-offset-2
            `}
            title="클릭하면 설명을 볼 수 있어요"
          >
            {seg.text}
          </span>
        );
      })}

      {activeIdx !== null && activeSegment && (
        <span
          ref={tooltipRef}
          className={`z-[9999] rounded-xl shadow-lg border ${activeBorderClass} bg-white p-3 text-xs text-gray-700 leading-relaxed`}
          style={tooltipStyle}
        >
          <span className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1 font-semibold text-gray-800">
              <span className={`w-2 h-2 rounded-full ${activeDotClass}`} />
              {activeLabelText}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setActiveIdx(null); }}
              className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
              aria-label="닫기"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </span>
          {activeSegment.caption}
        </span>
      )}
    </>
  );
}

/* ─── Section config ─── */
const SECTION_CONFIG: { key: string; label: string; color: string; iconPath: string }[] = [
  {
    key: '쉽게 풀어본 설명',
    label: '쉽게 풀어본 설명',
    color: 'text-indigo-500 bg-indigo-50 border-indigo-100',
    iconPath: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
  },
  {
    key: '집에서 이렇게 관리하세요',
    label: '집에서 이렇게 관리하세요',
    color: 'text-emerald-500 bg-emerald-50 border-emerald-100',
    iconPath: 'M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
  },
  {
    key: '이런 음식/음료는 피하세요',
    label: '이런 음식/음료는 피하세요',
    color: 'text-orange-500 bg-orange-50 border-orange-100',
    iconPath: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
  },
  {
    key: '같이 먹으면 안 되는 약',
    label: '같이 먹으면 안 되는 약',
    color: 'text-red-500 bg-red-50 border-red-100',
    iconPath: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  },
  {
    key: '다시 병원에 가야 할 때',
    label: '다시 병원에 가야 할 때',
    color: 'text-blue-500 bg-blue-50 border-blue-100',
    iconPath: 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z',
  },
];

function extractSection(text: string, sectionName: string): string | null {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
  const pattern = new RegExp(
    `(?:^|\\n)#+\\s*${escaped}[\\s]*\\n([\\s\\S]*?)(?=\\n#+\\s|$)`,
    'i',
  );
  const match = text.match(pattern);
  return match?.[1]?.trim() || null;
}

/* ─── SpeechRecognition type augmentation ─── */
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
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

/* ─── Phase type ─── */
type Phase = 'during' | 'after';

/* ─── Main page ─── */
export default function PostVisitPage() {
  const [phase, setPhase] = useState<Phase>('during');

  /* Recording state */
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Post-visit form state */
  const [doctorExplanation, setDoctorExplanation] = useState('');
  const [prescriptions, setPrescriptions] = useState('');
  const [precautions, setPrecautions] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* Medicine search */
  const [medicineName, setMedicineName] = useState('');
  const [medicineResult, setMedicineResult] = useState<{ name: string; description: string } | null>(null);
  const [medicineLoading, setMedicineLoading] = useState(false);
  const [medicineError, setMedicineError] = useState('');

  useEffect(() => {
    if (!getSpeechRecognition()) setSpeechSupported(false);
  }, []);

  const startRecording = useCallback(() => {
    const SRConstructor = getSpeechRecognition();
    if (!SRConstructor) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SRConstructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ko-KR';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let newFinal = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          newFinal += r[0].transcript + ' ';
        } else {
          interim += r[0].transcript;
        }
      }
      if (newFinal) setTranscript((prev) => prev + newFinal);
      setInterimText(interim);
    };

    recognition.onerror = (event: { error: string }) => {
      console.error('SpeechRecognition error:', event.error);
      if (event.error === 'not-allowed') {
        setSpeechSupported(false);
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch { /* already stopped */ }
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
    setRecordingSeconds(0);

    timerRef.current = setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      const ref = recognitionRef.current;
      recognitionRef.current = null;
      ref.onend = null;
      ref.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);

    const finalTranscript = (transcript + ' ' + interimText).trim();
    if (finalTranscript) {
      setDoctorExplanation(finalTranscript);
    }
    setInterimText('');
    setPhase('after');
  }, [transcript, interimText]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult('');

    const combined = [
      doctorExplanation && `[의사 설명]\n${doctorExplanation}`,
      prescriptions && `[처방 약]\n${prescriptions}`,
      precautions && `[주의사항]\n${precautions}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    if (!combined.trim()) {
      setError('최소 하나의 항목을 입력해 주세요.');
      setLoading(false);
      return;
    }

    try {
      const { simplified } = await simplifyExplanation(combined);
      setResult(simplified);
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function handleMedicineSearch() {
    if (!medicineName.trim()) return;
    setMedicineLoading(true);
    setMedicineError('');
    setMedicineResult(null);

    try {
      const info = await getMedicineInfo(medicineName.trim());
      setMedicineResult(info);
    } catch (err) {
      setMedicineError(err instanceof Error ? err.message : '약 정보를 불러올 수 없습니다.');
    } finally {
      setMedicineLoading(false);
    }
  }

  const hasSections = SECTION_CONFIG.some((s) => extractSection(result, s.key));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors mb-2 inline-block"
          >
            ← 홈으로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">진료 중 · 진료 후 안내</h1>
          <p className="text-sm text-gray-500 mt-1">
            진료 중 녹음으로 자동 기록하고, 진료 후 이해하기 쉬운 안내를 받아보세요
          </p>
        </div>

        {/* Phase tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 max-w-xs">
          <button
            onClick={() => { if (!isRecording) setPhase('during'); }}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              phase === 'during'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              {isRecording && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
              진료 중
            </span>
          </button>
          <button
            onClick={() => { if (!isRecording) setPhase('after'); }}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              phase === 'after'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            진료 후
          </button>
        </div>

        {/* ═══ PHASE: 진료 중 ═══ */}
        {phase === 'during' && (
          <div className="max-w-2xl">
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
              {/* Recording header */}
              <div className="px-6 py-5 border-b border-gray-50">
                <h2 className="text-base font-semibold text-gray-800 mb-1">진료 녹음</h2>
                <p className="text-xs text-gray-400">
                  녹음 버튼을 누르면 의사의 설명이 자동으로 텍스트로 변환됩니다.
                  {!speechSupported && ' (이 브라우저에서는 음성 인식이 지원되지 않습니다. Chrome 사용을 권장합니다.)'}
                </p>
              </div>

              {/* Recording area */}
              <div className="px-6 py-8 flex flex-col items-center">
                {/* Timer */}
                {isRecording && (
                  <div className="mb-6 text-center">
                    <p className="text-3xl font-mono font-light text-gray-700 tracking-wider">
                      {formatTime(recordingSeconds)}
                    </p>
                    <p className="text-xs text-red-500 mt-1 flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      녹음 중
                    </p>
                  </div>
                )}

                {/* Record button */}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!speechSupported}
                  className={`
                    w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300
                    disabled:opacity-30 disabled:cursor-not-allowed
                    ${isRecording
                      ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200 scale-110'
                      : 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-200 hover:scale-105'
                    }
                  `}
                >
                  {isRecording ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  ) : (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white">
                      <path d="M12 2a4 4 0 00-4 4v5a4 4 0 008 0V6a4 4 0 00-4-4z" fill="currentColor" />
                      <path d="M19 11a7 7 0 01-14 0M12 18v4m-3 0h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )}
                </button>

                <p className="text-xs text-gray-400 mt-4">
                  {isRecording ? '진료가 끝나면 버튼을 눌러 종료하세요' : '버튼을 눌러 녹음을 시작하세요'}
                </p>
              </div>

              {/* Live transcript */}
              {(transcript || interimText) && (
                <div className="px-6 pb-6">
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 max-h-48 overflow-y-auto">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">실시간 변환</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {transcript}
                      {interimText && <span className="text-gray-400">{interimText}</span>}
                    </p>
                  </div>
                </div>
              )}

              {/* Manual skip */}
              {!isRecording && (
                <div className="px-6 pb-5 border-t border-gray-50 pt-4">
                  <button
                    onClick={() => setPhase('after')}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    녹음 없이 직접 입력하기 →
                  </button>
                </div>
              )}
            </div>

            {/* Tip card */}
            <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
              <p className="text-xs text-emerald-700 leading-relaxed">
                <span className="font-semibold">Tip:</span> 진료 시 태블릿이나 핸드폰을 의사 가까이 놓아두면 인식률이 높아집니다.
                녹음이 끝나면 텍스트가 자동으로 &quot;진료 후&quot; 탭에 입력됩니다.
              </p>
            </div>
          </div>
        )}

        {/* ═══ PHASE: 진료 후 ═══ */}
        {phase === 'after' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Left: Input form */}
            <div className="md:col-span-2 space-y-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    의사가 한 설명
                  </label>
                  <textarea
                    rows={4}
                    value={doctorExplanation}
                    onChange={(e) => setDoctorExplanation(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 resize-none transition-all"
                    placeholder="진료 중 들은 말을 기억나는 대로 적어주세요"
                  />
                  {transcript && (
                    <p className="text-[10px] text-emerald-500 mt-1">녹음 내용이 자동 입력되었습니다</p>
                  )}
                </div>

                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    처방받은 약
                  </label>
                  <input
                    type="text"
                    value={prescriptions}
                    onChange={(e) => setPrescriptions(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition-all"
                    placeholder="예: 타이레놀, 아목시실린"
                  />
                </div>

                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    들은 주의사항
                  </label>
                  <textarea
                    rows={2}
                    value={precautions}
                    onChange={(e) => setPrecautions(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 resize-none transition-all"
                    placeholder="기억나는 주의사항이 있으면 적어주세요"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      정리하는 중...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                        <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7l3-7z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
                      </svg>
                      쉽게 정리해 주세요
                    </>
                  )}
                </button>
              </form>

              {/* Medicine quick search */}
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">약 정보 검색</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={medicineName}
                    onChange={(e) => setMedicineName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleMedicineSearch()}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition-all"
                    placeholder="약 이름 입력"
                  />
                  <button
                    type="button"
                    onClick={handleMedicineSearch}
                    disabled={medicineLoading || !medicineName.trim()}
                    className="px-3 py-2 rounded-lg border border-emerald-300 text-emerald-600 text-sm font-medium hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {medicineLoading ? '...' : '검색'}
                  </button>
                </div>

                {medicineError && (
                  <p className="mt-2 text-xs text-red-500">{medicineError}</p>
                )}

                {medicineResult && (
                  <div className="mt-3 rounded-lg bg-gray-50 border border-gray-100 p-3">
                    <p className="text-sm font-semibold text-gray-800 mb-1">{medicineResult.name}</p>
                    <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                      {medicineResult.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Back to recording */}
              <button
                onClick={() => setPhase('during')}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
              >
                ← 다시 녹음하기
              </button>
            </div>

            {/* Right: Results */}
            <div className="md:col-span-3">
              {/* Highlight legend */}
              {result && hasSections && (
                <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-4 h-3 rounded bg-emerald-200/70 border border-emerald-300" />
                    용어 설명
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-4 h-3 rounded bg-yellow-200/70 border border-yellow-300" />
                    주의
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-4 h-3 rounded bg-orange-200/70 border border-orange-300" />
                    꼭 지켜야 함
                  </span>
                  <span className="text-gray-300">| 클릭하면 상세 설명</span>
                </div>
              )}

              {!result && !loading && (
                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-8 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-emerald-400">
                      <path d="M9 12h6M12 9v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-gray-700 mb-1">정리 결과가 여기에 표시됩니다</h3>
                  <p className="text-sm text-gray-400 max-w-sm">
                    왼쪽에 진료 정보를 입력하고 &quot;쉽게 정리해 주세요&quot; 버튼을 누르면
                    이해하기 쉬운 형태로 정리해 드립니다
                  </p>
                </div>
              )}

              {loading && (
                <div className="rounded-2xl bg-white border border-emerald-100 shadow-sm p-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative w-12 h-12 mb-4">
                      <div className="absolute inset-0 rounded-full border-[3px] border-emerald-100" />
                      <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-emerald-500 animate-spin" />
                    </div>
                    <p className="text-sm font-medium text-gray-700 mb-1">정보를 정리하고 있습니다</p>
                    <p className="text-xs text-gray-400">이해하기 쉬운 형태로 변환 중입니다</p>
                  </div>
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  {hasSections ? (
                    SECTION_CONFIG.map((section) => {
                      const content = extractSection(result, section.key);
                      if (!content) return null;
                      const colorParts = section.color.split(' ');
                      const textColor = colorParts[0];
                      const bgColor = colorParts[1];
                      const borderColor = colorParts[2];
                      const segments = parseHighlights(content);
                      return (
                        <div key={section.key} className={`rounded-2xl bg-white border shadow-sm overflow-hidden ${borderColor}`}>
                          <div className={`flex items-center gap-2 px-5 py-3 ${bgColor} border-b ${borderColor}`}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={textColor}>
                              <path d={section.iconPath} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <h3 className={`text-sm font-semibold ${textColor}`}>{section.label}</h3>
                          </div>
                          <div className="px-5 py-4">
                            <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                              <HighlightedText segments={segments} />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                      <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                        <HighlightedText segments={parseHighlights(result)} />
                      </div>
                    </div>
                  )}

                  <details className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                    <summary className="px-5 py-3 text-xs text-gray-400 cursor-pointer hover:text-gray-600 transition-colors">
                      전체 원문 보기
                    </summary>
                    <div className="px-5 pb-4">
                      <pre className="whitespace-pre-wrap text-xs text-gray-500 leading-relaxed font-sans">
                        {result}
                      </pre>
                    </div>
                  </details>

                  <button
                    onClick={() => { setResult(''); }}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    다시 입력하기
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-[10px] text-gray-300 text-center mt-8">
          본 정보는 의료 전문가의 진단을 대체할 수 없습니다. 정확한 복약 지도는 약사에게 문의하세요.
        </p>
      </div>
    </div>
  );
}
