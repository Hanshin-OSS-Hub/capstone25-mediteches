'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import ConsentToggle from '@/components/consent/ConsentToggle';
import {
  CONSENT_VERSION,
  TERMS_OF_SERVICE,
  PRIVACY_POLICY,
  SENSITIVE_INFO_POLICY,
} from '@/lib/consentContent';
import { formatResidentId, validateResidentId } from '@/lib/residentId';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [residentId, setResidentId] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [agreedSensitive, setAgreedSensitive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const residentValid = validateResidentId(residentId);
  const isValid =
    name.trim().length > 0 &&
    phone.trim().length > 0 &&
    residentValid &&
    agreedTerms &&
    agreedPrivacy &&
    agreedSensitive;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setError('');
    setSubmitting(true);
    try {
      await login({
        name: name.trim(),
        phone: phone.trim(),
        residentId,
        agreedTerms,
        agreedPrivacy,
        agreedSensitive,
        consentVersion: CONSENT_VERSION,
      });
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
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-emerald-600">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">게스트 로그인</h1>
          <p className="mt-2 text-sm text-gray-500">
            정보 입력 후 약관에 동의하고 서비스를 이용하세요
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm space-y-5"
        >
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1.5">이름</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              required
              className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-400 transition-colors focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            />
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1.5">연락처</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-1234-5678"
              required
              className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-400 transition-colors focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            />
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1.5">주민등록번호</span>
            <input
              type="text"
              inputMode="numeric"
              value={residentId}
              onChange={(e) => setResidentId(formatResidentId(e.target.value))}
              placeholder="000000-0000000"
              required
              autoComplete="off"
              className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-400 transition-colors focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            />
            {residentId.length > 0 && !residentValid && (
              <p className="mt-1 text-xs text-red-500">올바른 주민등록번호를 입력해 주세요.</p>
            )}
            <p className="mt-1 text-xs text-gray-400">암호화 저장되며 앱 내에서는 표시되지 않습니다.</p>
          </label>

          <div className="space-y-3 pt-2">
            <ConsentToggle
              id="consent-terms"
              label="서비스 이용약관에 동의합니다"
              checked={agreedTerms}
              onChange={setAgreedTerms}
            >
              {TERMS_OF_SERVICE}
            </ConsentToggle>

            <ConsentToggle
              id="consent-privacy"
              label="개인정보 수집 및 이용에 동의합니다"
              checked={agreedPrivacy}
              onChange={setAgreedPrivacy}
            >
              {PRIVACY_POLICY}
            </ConsentToggle>

            <ConsentToggle
              id="consent-sensitive"
              label="민감정보(주민등록번호) 처리에 동의합니다"
              checked={agreedSensitive}
              onChange={setAgreedSensitive}
            >
              {SENSITIVE_INFO_POLICY}
            </ConsentToggle>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={!isValid || submitting}
            className="w-full"
          >
            {submitting ? '처리 중…' : '시작하기'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          로그인 없이도 일부 기능을 이용할 수 있습니다
        </p>
      </div>
    </div>
  );
}
