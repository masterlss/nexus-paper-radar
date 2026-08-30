import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'NEXUS — 搜广推论文雷达',
  description: '为搜索算法工程师打造的搜广推与大模型论文智能工作台。',
  openGraph: {
    title: 'NEXUS — 搜广推论文雷达',
    description: '定期抓取、筛选和初读搜广推与大模型论文。',
    images: [{ url: new URL('/og.png', siteUrl).toString(), width: 1200, height: 630, alt: '搜广推论文雷达' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NEXUS — 搜广推论文雷达',
    description: '定期抓取、筛选和初读搜广推与大模型论文。',
    images: [new URL('/og.png', siteUrl).toString()],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
