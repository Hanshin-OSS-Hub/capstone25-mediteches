'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const navLinks = [
  { href: '/', label: '홈' },
  { href: '/bodymap', label: '바디맵' },
  { href: '/summary', label: '증상 요약' },
  { href: '/postvisit', label: '진료 중 · 진료 후' },
];

export default function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-100">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            className="text-emerald-500"
          >
            <rect x="11" y="4" width="6" height="20" rx="2" fill="currentColor" />
            <rect x="4" y="11" width="20" height="6" rx="2" fill="currentColor" />
          </svg>
          <span className="text-xl font-bold text-gray-900 tracking-tight">
            메디테치
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'text-emerald-600 bg-emerald-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User / Mobile toggle */}
        <div className="flex items-center gap-3">
          {user && (
            <span className="hidden sm:inline text-sm text-gray-500">
              {user.name}님
            </span>
          )}

          {/* Hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="메뉴 열기"
          >
            {mobileOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-gray-100 bg-white px-4 pb-4 pt-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  block px-4 py-3 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'text-emerald-600 bg-emerald-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                {link.label}
              </Link>
            );
          })}
          {user && (
            <div className="mt-2 px-4 py-2 text-sm text-gray-400">
              {user.name}님으로 로그인됨
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
