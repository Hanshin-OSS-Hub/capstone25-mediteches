import { CONSENT_VERSION, TERMS_OF_SERVICE, PRIVACY_POLICY, SENSITIVE_INFO_POLICY } from '@/lib/consentContent';

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">약관 및 개인정보</h1>
      <div className="space-y-8 text-sm text-gray-600">
        <section className="rounded-xl border border-gray-200 p-6">{TERMS_OF_SERVICE}</section>
        <section className="rounded-xl border border-gray-200 p-6">{PRIVACY_POLICY}</section>
        <section className="rounded-xl border border-gray-200 p-6">{SENSITIVE_INFO_POLICY}</section>
        <p className="text-xs text-gray-400">버전: {CONSENT_VERSION}</p>
      </div>
    </div>
  );
}
