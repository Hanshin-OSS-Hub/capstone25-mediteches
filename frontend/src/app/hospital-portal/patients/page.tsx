'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getHospitalPatients,
  decryptPatientPii,
  getDecryptAuditLog,
  type PatientSummary,
} from '@/lib/api';
import { TOKEN_KEY, STAFF_KEY } from '../login/page';
import Button from '@/components/ui/Button';

interface DecryptedInfo {
  name: string;
  phone: string;
  residentId: string;
}

export default function HospitalPatientsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [staffName, setStaffName] = useState('');
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [decrypted, setDecrypted] = useState<Record<string, DecryptedInfo>>({});
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; user_id: string; fields_accessed: string[]; accessed_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    const staffRaw = localStorage.getItem(STAFF_KEY);
    if (!t) {
      router.replace('/hospital-portal/login');
      return;
    }
    setToken(t);
    if (staffRaw) {
      try {
        const staff = JSON.parse(staffRaw);
        setStaffName(staff.name || '');
      } catch { /* ignore */ }
    }

    async function load() {
      try {
        const [patRes, logRes] = await Promise.all([
          getHospitalPatients(t!),
          getDecryptAuditLog(t!),
        ]);
        setPatients(patRes.patients);
        setAuditLogs(logRes.logs);
      } catch (err) {
        setError(err instanceof Error ? err.message : '데이터 로드 실패');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  async function handleDecrypt(patientId: string) {
    if (!token) return;
    try {
      const res = await decryptPatientPii(token, patientId);
      setDecrypted((prev) => ({ ...prev, [patientId]: res.decrypted }));
      const logRes = await getDecryptAuditLog(token);
      setAuditLogs(logRes.logs);
    } catch (err) {
      alert(err instanceof Error ? err.message : '복호화 실패');
    }
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(STAFF_KEY);
    router.push('/hospital-portal/login');
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">로딩 중…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">환자 목록</h1>
          {staffName && <p className="text-sm text-slate-500 mt-1">{staffName}님 · PQC 복호화 열람</p>}
        </div>
        <Button variant="secondary" onClick={handleLogout}>로그아웃</Button>
      </div>

      {error && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">{error}</div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">등록 환자</h2>
        {patients.length === 0 ? (
          <p className="text-slate-400 text-sm py-8 text-center">등록된 환자가 없습니다.</p>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden">
            {patients.map((p) => (
              <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{p.nameMasked}</p>
                  <p className="text-sm text-slate-500">{p.phoneMasked}</p>
                  <p className="text-xs text-slate-400 mt-1">ID: {p.id.slice(0, 8)}…</p>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  {decrypted[p.id] ? (
                    <div className="text-sm bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                      <p>이름: {decrypted[p.id].name}</p>
                      <p>연락처: {decrypted[p.id].phone}</p>
                      <p>주민번호: {decrypted[p.id].residentId}</p>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => handleDecrypt(p.id)}>
                      상세 열람 (복호화)
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">감사 로그 (최근 50건)</h2>
        {auditLogs.length === 0 ? (
          <p className="text-slate-400 text-sm">열람 기록이 없습니다.</p>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white text-sm">
            {auditLogs.map((log) => (
              <div key={log.id} className="px-4 py-3 flex justify-between gap-4">
                <span className="text-slate-600">환자 {log.user_id.slice(0, 8)}… · {log.fields_accessed.join(', ')}</span>
                <span className="text-slate-400 shrink-0">{new Date(log.accessed_at).toLocaleString('ko-KR')}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
