import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import FloatingChat from "@/components/layout/FloatingChat";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "메디테치 바디맵 | 의료 커뮤니케이션 보조 서비스",
  description:
    "증상을 시각적으로 표현하고, 진료과를 추천받고, 의료 정보를 쉽게 이해하세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} antialiased bg-white text-gray-900`}>
        <AuthProvider>
          <Header />
          <main className="min-h-screen pt-16">{children}</main>
          <FloatingChat />
        </AuthProvider>
      </body>
    </html>
  );
}
