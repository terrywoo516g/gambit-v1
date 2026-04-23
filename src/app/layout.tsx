import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import ToastContainer from '@/components/Toast'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'Gambit — 多AI协作决策工作台',
  description: '重要决定，不该只听一个AI的。让多个顶级AI同时分析，综合出最优解。',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <ToastContainer />
      </body>
    </html>
  )
}