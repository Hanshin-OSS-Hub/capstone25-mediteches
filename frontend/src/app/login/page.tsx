'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isValid = name.trim().length > 0 && phone.trim().length > 0 && agreed;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setError('');
    setSubmitting(true);
    try {
      await login(name.trim(), phone.trim(), agreed);
      router.push('/');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '로그인에 실패했습니다. 다시 시도해 주세요.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/30">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-emerald-600">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">게스트 로그인</h1>
          <p className="mt-2 text-sm text-gray-500">
            간편하게 정보를 입력하고 서비스를 이용하세요
          </p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm"
        >
          {error && (
            <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Name */}
          <label className="block mb-5">
            <span className="block text-sm font-medium text-gray-700 mb-1.5">
              이름
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              required
              className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-400 transition-colors focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            />
          </label>

          {/* Phone */}
          <label className="block mb-6">
            <span className="block text-sm font-medium text-gray-700 mb-1.5">
              연락처
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-1234-5678"
              required
              className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-400 transition-colors focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            />
          </label>

          {/* Privacy agreement */}
          <div className="mb-6">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-emerald-500 accent-emerald-500 focus:ring-emerald-400"
              />
              <span className="text-sm text-gray-700 leading-snug">
                <span className="font-medium">개인정보 수집 및 이용</span>에 동의합니다
              </span>
            </label>

            <button
              type="button"
              onClick={() => setShowPolicy(!showPolicy)}
              className="mt-2 ml-8 text-xs text-emerald-600 hover:text-emerald-700 underline underline-offset-2 focus:outline-none"
            >
              {showPolicy ? '개인정보 처리방침 접기' : '개인정보 처리방침 보기'}
            </button>

            {showPolicy && (
              <div className="mt-3 ml-8 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs leading-relaxed text-gray-600">
                <p className="font-semibold text-gray-800 mb-2">
                  개인정보 수집 및 이용 동의서
                </p>
                <p className="mb-2">
                  「개인정보 보호법」에 따라 메디테치 바디맵 서비스 이용을 위해 아래와 같이
                  개인정보를 수집·이용합니다.
                </p>
                <table className="w-full border-collapse text-left mb-3">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="py-1.5 pr-2 font-semibold text-gray-800">항목</th>
                      <th className="py-1.5 font-semibold text-gray-800">내용</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="py-1.5 pr-2 font-medium text-gray-700">수집 항목</td>
                      <td className="py-1.5">이름, 연락처</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-2 font-medium text-gray-700">수집 목적</td>
                      <td className="py-1.5">
                        서비스 이용자 식별, 증상 기록 및 진료 보조 정보 제공
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-2 font-medium text-gray-700">보유 기간</td>
                      <td className="py-1.5">
                        서비스 이용 종료 시 또는 수집일로부터 1년 후 파기
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p>
                  귀하는 위 동의를 거부할 권리가 있으며, 동의 거부 시 서비스 이용이
                  제한될 수 있습니다.
                </p>
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            disabled={!isValid || submitting}
            className="w-full"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                처리 중…
              </span>
            ) : (
              '시작하기'
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          로그인 없이도 일부 기능을 이용할 수 있습니다
        </p>
      </div>
    </div>
  );
}
