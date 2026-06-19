import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import { Jua, Noto_Sans_KR, Geist_Mono } from 'next/font/google'
import './globals.css'

const jua = Jua({
  weight: '400',
  variable: '--font-jua',
  subsets: ['latin'],
})
const notoSansKr = Noto_Sans_KR({
  variable: '--font-noto-kr',
  subsets: ['latin'],
})
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: '도란도란 | 우리 아이를 위한 AI 전래동화',
  description:
    '문해력 테스트로 시작해 우리 아이만을 위한 한국형 전래동화를 만들고, 다시 문해력을 측정하는 AI 동화 서비스 도란도란.',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ko"
      className={`${jua.variable} ${notoSansKr.variable} ${geistMono.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
