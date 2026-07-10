import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "学伴 · 学生学习工具",
  description: "整合自主思考笔记、知识点管理、错题本与 AI 学习伙伴的综合性学习工具。",
  keywords: ["学习工具", "知识管理", "错题本", "AI 学习", "思考笔记"],
  manifest: "/manifest.json",
  applicationName: "学伴",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "学伴",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#2a9d8f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

// Service Worker 注册脚本(仅在生产环境)
const SW_REGISTER = `
  if ('serviceWorker' in navigator && '${process.env.NODE_ENV}' === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW 注册失败:', err);
      });
    });
  }
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SW_REGISTER }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <Sonner position="top-center" />
      </body>
    </html>
  );
}
