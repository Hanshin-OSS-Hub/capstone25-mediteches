import Link from "next/link";
import Card from "@/components/ui/Card";

const features = [
  {
    title: "바디맵 증상 입력",
    desc: "인체 도식 위에 증상을 직접 표시하고 구조화합니다",
    href: "/bodymap",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-emerald-500">
        <circle cx="24" cy="8" r="4" />
        <path d="M24 12v12M24 24l-6 12M24 24l6 12M18 16l-6 4M30 16l6 4" />
      </svg>
    ),
  },
  {
    title: "증상 요약 카드",
    desc: "입력된 증상을 한눈에 이해할 수 있게 정리합니다",
    href: "/summary",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-emerald-500">
        <rect x="8" y="4" width="32" height="40" rx="3" />
        <path d="M16 14h16M16 22h16M16 30h10" />
      </svg>
    ),
  },
  {
    title: "진료과 추천",
    desc: "증상에 따른 적절한 진료과를 안내합니다",
    href: "/recommend",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-emerald-500">
        <circle cx="24" cy="18" r="8" />
        <path d="M14 18c0-5.523 4.477-10 10-10s10 4.477 10 10" />
        <path d="M18 34c0 0 2-4 6-4s6 4 6 4" />
        <path d="M12 42c2-6 6-10 12-10s10 4 12 10" />
        <path d="M32 14l4-4M34 12l-2 4M36 10l-4 2" />
      </svg>
    ),
  },
  {
    title: "병원/약국 탐색",
    desc: "주변 병원과 약국 정보 및 길찾기를 제공합니다",
    href: "/hospital",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-emerald-500">
        <rect x="8" y="14" width="32" height="28" rx="3" />
        <path d="M20 6h8v8h-8z" />
        <path d="M24 22v10M19 27h10" />
        <path d="M16 42v-8h6v8M26 42v-8h6v8" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30" />
        <div className="relative mx-auto max-w-6xl px-6 py-28 text-center">
          <span className="inline-block rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-700 mb-6">
            의료 커뮤니케이션 보조 서비스
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            메디테치 <span className="text-emerald-500">바디맵</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600">
            환자가 자신의 증상을 더 잘 설명하고, 의료 정보를 더 잘 이해하도록 돕는 웹 서비스
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/bodymap"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-3.5 text-lg font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:bg-emerald-600 hover:shadow-xl hover:shadow-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
            >
              시작하기
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L11.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 11-1.04-1.08l3.158-2.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            주요 기능
          </h2>
          <p className="mt-3 text-gray-500">
            증상 입력부터 병원 탐색까지, 진료의 모든 단계를 지원합니다
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Link key={f.href} href={f.href} className="group block">
              <Card hoverable className="h-full flex flex-col items-start gap-4 group-focus:ring-2 group-focus:ring-emerald-400 group-focus:ring-offset-2">
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-emerald-50 transition-colors duration-200 group-hover:bg-emerald-100">
                  {f.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors duration-200">
                    {f.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                    {f.desc}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Post-visit section */}
      <section className="bg-gradient-to-r from-emerald-50 to-emerald-100/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-16">
            <div className="flex-1">
              <span className="inline-block rounded-full bg-emerald-200/60 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-4">
                진료 후
              </span>
              <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                진료 후 설명 재구성
              </h2>
              <p className="mt-4 text-gray-600 leading-relaxed max-w-lg">
                진료 중 들은 의학 용어나 설명을 이해하기 쉬운 말로 다시 정리해
                드립니다. 검사 결과, 처방 내용, 주의 사항 등을 놓치지 마세요.
              </p>
              <Link
                href="/postvisit"
                className="mt-6 inline-flex items-center gap-2 text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
              >
                자세히 보기
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L11.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 11-1.04-1.08l3.158-2.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>

            <div className="flex-shrink-0 w-64 h-64 flex items-center justify-center">
              <svg viewBox="0 0 200 200" fill="none" className="w-full h-full text-emerald-500/20">
                <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="2" />
                <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="2" />
                <g className="text-emerald-500" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="70" y="55" width="60" height="80" rx="6" fill="white" />
                  <path d="M85 78h30M85 90h30M85 102h20" />
                  <circle cx="100" cy="68" r="4" fill="currentColor" />
                  <path d="M88 120l8 8 16-16" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          지금 바로 시작하세요
        </h2>
        <p className="mt-3 text-gray-500">
          로그인 없이 간편하게 이용할 수 있습니다
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/bodymap"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-7 py-3 font-semibold text-white shadow-sm transition-all duration-200 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
          >
            바디맵 시작하기
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-7 py-3 font-semibold text-gray-700 transition-all duration-200 hover:border-emerald-300 hover:text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
          >
            게스트 로그인
          </Link>
        </div>
      </section>
    </div>
  );
}
