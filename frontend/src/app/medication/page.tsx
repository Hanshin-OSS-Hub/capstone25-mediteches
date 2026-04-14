// src/app/medication/page.tsx
import MedicationDashboard from '@/components/MedicationDashboard';
import Link from 'next/link';

export default function MedicationPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-emerald-600 mb-8 inline-block hover:underline">
          ← 홈으로 돌아가기
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">복약 관리 대시보드</h1>
        <p className="text-gray-500 mb-10">건강한 하루를 위해 AI가 스케줄을 관리합니다.</p>
        
        {/* 아래에서 만들 대시보드 컴포넌트를 불러옵니다 */}
        <MedicationDashboard />
      </div>
    </main>
  );
}