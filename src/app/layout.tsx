import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: 'Gambit — 重要决定，不该只听一个 AI 的',
  description: '让多个顶级 AI 同时分析你的问题，给出不同角度的回答，再由专业 AI 综合出最优解。',
  icons: {
    icon: '/favicon.png',
  },
  openGraph: {
    title: 'Gambit',
    description: '重要决定，不该只听一个 AI 的',
    images: ['/mascot.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geistSans.variable)}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
