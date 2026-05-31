'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { hospitalLogin } from '@/lib/api';
import Button from '@/components/ui/Button';

const TOKEN_KEY = 'meditech_hospital_token';
const STAFF_KEY = 'meditech_hospital_staff';

export { TOKEN_KEY, STAFF_KEY };

export default function HospitalPortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await hospitalLogin(email, password);
      localStorage.setItem(TOKEN_KEY, res.token);
      localStorage.setItem(STAFF_KEY, JSON.stringify(res.staff));
      router.push('/hospital-portal/patients');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">병원 포털</h1>
          <p className="mt-2 text-sm text-slate-500">환자 PII 복호화 열람 (감사 로그 기록)</p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
          )}
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1.5">이메일</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1.5">비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            />
          </label>
          <Button type="submit" size="lg" disabled={submitting} className="w-full">
            {submitting ? '로그인 중…' : '로그인'}
          </Button>
        </form>
      </div>
    </div>
  );
}
