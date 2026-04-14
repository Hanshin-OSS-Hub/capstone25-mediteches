"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Card from './ui/Card';

interface Medication {
  id: number;
  name: string;
  start: number; 
  interval: number;
  count: number;
  color: string;
}

export default function MedicationDashboard() {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [inputName, setInputName] = useState('');
  const [inputStart, setInputStart] = useState(8); 
  const [inputInterval, setInputInterval] = useState(6);
  const [inputCount, setInputCount] = useState(3);
  const [currentTime, setCurrentTime] = useState(new Date());

  // 데이터 불러오기/저장
  useEffect(() => {
    const savedMeds = localStorage.getItem('mediteches_meds');
    if (savedMeds) setMeds(JSON.parse(savedMeds));
  }, []);

  useEffect(() => {
    localStorage.setItem('mediteches_meds', JSON.stringify(meds));
  }, [meds]);

  // 타이머
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatHour = (num: number) => {
    const h = Math.floor(num);
    const m = num % 1 === 0.5 ? "30" : "00";
    return `${h < 10 ? '0' + h : h}:${m}`;
  };

  const addMed = () => {
    if (!inputName) return alert("약 이름을 입력해주세요!");
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    const newMed: Medication = {
      id: Date.now(),
      name: inputName,
      start: inputStart,
      interval: inputInterval,
      count: inputCount,
      color: colors[meds.length % colors.length]
    };
    setMeds([...meds, newMed]);
    setInputName('');
  };

  const removeMed = (id: number) => setMeds(meds.filter(m => m.id !== id));

  const getDoseTimes = (m: Medication) => {
    const times = [];
    for (let i = 0; i < m.count; i++) {
      const t = m.start + (i * m.interval);
      if (t >= 24) break;
      times.push(t);
    }
    return times;
  };

  const nextDoseInfo = useMemo(() => {
    if (meds.length === 0) return null;
    const nowInMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const nowSec = currentTime.getSeconds();
    let minDiffInMinutes = Infinity;
    let nextMedNames: string[] = [];

    meds.forEach(m => {
      const doses = getDoseTimes(m);
      doses.forEach(doseTime => {
        const doseInMinutes = doseTime * 60;
        const diff = doseInMinutes - nowInMinutes;
        if (diff > 0) {
          if (diff < minDiffInMinutes) {
            minDiffInMinutes = diff;
            nextMedNames = [m.name];
          } else if (diff === minDiffInMinutes) {
            if (!nextMedNames.includes(m.name)) nextMedNames.push(m.name);
          }
        }
      });
    });

    if (minDiffInMinutes === Infinity) return null;
    const totalSec = minDiffInMinutes * 60 - nowSec;
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return { name: nextMedNames.join(', '), timeStr: `${h}시간 ${m}분 ${s}초` };
  }, [meds, currentTime]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-10 pb-24 p-6 animate-in fade-in duration-700">
      
      {/* 1. 최상단: 타이머 배너 */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-10 rounded-[3rem] shadow-xl text-white flex items-center justify-between relative overflow-hidden">
        <div className="relative z-10">
          <span className="text-emerald-100 font-bold text-xs uppercase tracking-[0.2em] opacity-80">Next Reminder</span>
          {nextDoseInfo ? (
            <div className="mt-3">
              <h2 className="text-5xl font-black">{nextDoseInfo.timeStr}</h2>
              <p className="text-emerald-50 mt-2 text-lg font-medium italic">🔔 {nextDoseInfo.name} 드실 시간까지</p>
            </div>
          ) : (
            <h2 className="text-2xl font-bold mt-3">남은 일정이 없습니다! 🍀</h2>
          )}
        </div>
        <div className="text-8xl opacity-20 animate-pulse hidden sm:block">💊</div>
      </div>

      {/* 2. 스케줄 설정 (타이머 바로 밑) */}
      <Card className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-sm">
        <h3 className="text-xl font-bold text-gray-800 mb-8 flex items-center gap-3">
          <span className="text-2xl">💊</span> 스케줄 설정
        </h3>
        <div className="space-y-8">
          <div className="group">
            <label className="text-xs font-bold text-gray-400 mb-2 block ml-1">약 이름</label>
            <input 
              type="text" value={inputName} onChange={(e) => setInputName(e.target.value)}
              placeholder="약 이름을 입력해 주세요" 
              className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-gray-700 placeholder:font-normal"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-5 rounded-2xl">
              <label className="text-[10px] font-bold text-gray-400 mb-3 block text-center uppercase tracking-tighter">첫 복용: {formatHour(inputStart)}</label>
              <input type="range" min="0" max="23.5" step="0.5" value={inputStart} onChange={(e) => setInputStart(Number(e.target.value))} className="w-full accent-emerald-500" />
            </div>
            <div className="bg-gray-50 p-5 rounded-2xl">
              <label className="text-[10px] font-bold text-gray-400 mb-3 block text-center uppercase tracking-tighter">간격: {inputInterval}시간</label>
              <input type="range" min="1" max="12" step="1" value={inputInterval} onChange={(e) => setInputInterval(Number(e.target.value))} className="w-full accent-emerald-500" />
            </div>
            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
              <label className="text-[10px] font-bold text-emerald-600 mb-3 block text-center uppercase tracking-tighter">횟수: {inputCount}회</label>
              <input type="range" min="1" max="10" step="1" value={inputCount} onChange={(e) => setInputCount(Number(e.target.value))} className="w-full accent-emerald-500" />
            </div>
          </div>
          
          <button onClick={addMed} className="w-full py-5 bg-emerald-500 text-white font-black text-lg rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-100 active:scale-[0.98]">
            복약 스케줄 등록하기
          </button>
        </div>
      </Card>

      {/* 3. 등록된 약 목록 (스케줄 설정 밑) */}
      <Card className="bg-gray-50/30 border border-gray-100 p-8 rounded-[2.5rem] shadow-sm">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <span className="text-2xl">📂</span> 등록된 약 목록
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {meds.length === 0 ? (
            <p className="col-span-full text-gray-400 text-center py-10 italic">아직 등록된 약이 없습니다.</p>
          ) : (
            meds.map(m => (
              <div key={m.id} className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-emerald-200 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-2.5 h-10 rounded-full" style={{ backgroundColor: m.color }}></div>
                  <div>
                    <p className="font-black text-gray-800">{m.name}</p>
                    <p className="text-[10px] text-gray-400 font-medium">
                      {formatHour(m.start)} 시작 / {m.interval}H 간격 / <span className="text-emerald-500 font-bold">{m.count}회</span>
                    </p>
                  </div>
                </div>
                <button onClick={() => removeMed(m.id)} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-full transition-all">✕</button>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* 4. 오늘의 스케줄러 (최하단) */}
      <Card className="bg-white border border-gray-100 p-10 rounded-[2.5rem] shadow-sm">
        <div className="flex items-center justify-between mb-10">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
            <span className="text-2xl">📅</span> 24시간 복약 스케줄러
          </h3>
          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Daily Timeline</span>
        </div>
        
        <div className="space-y-1">
          {Array.from({ length: 24 }).map((_, hour) => {
            const doseItems: { name: string; color: string; time: number }[] = [];
            meds.forEach(m => {
              getDoseTimes(m).forEach(t => {
                if (Math.floor(t) === hour) doseItems.push({ name: m.name, color: m.color, time: t });
              });
            });
            doseItems.sort((a, b) => a.time - b.time);
            if (doseItems.length === 0) return null;

            return (
              <div key={hour} className="flex border-b border-gray-50 min-h-[80px] group items-center">
                <div className="w-20 text-sm font-mono text-gray-300 group-hover:text-emerald-500 font-black transition-colors">
                  {hour < 10 ? `0${hour}` : hour}:00
                </div>
                <div className="flex-1 flex flex-wrap gap-3 py-3">
                  {doseItems.map((item, idx) => (
                    <div 
                      key={`${item.name}-${idx}`}
                      style={{ backgroundColor: `${item.color}10`, color: item.color, borderColor: `${item.color}30` }}
                      className="px-5 py-3 rounded-2xl text-sm font-black border-2 flex items-center gap-3 shadow-sm hover:scale-[1.03] transition-transform cursor-default"
                    >
                      <span className="text-[10px] bg-white px-2 py-0.5 rounded-lg border font-bold">
                        {item.time % 1 === 0.5 ? "30분" : "정각"}
                      </span>
                      {item.name}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      
      <p className="text-center text-gray-300 text-[10px] font-medium tracking-tight">
        © 2026 MEDITECH BODYMAP - SMART MEDICATION ASSISTANT
      </p>
    </div>
  );
}