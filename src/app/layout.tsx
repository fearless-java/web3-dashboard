import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "./lib/query-provider";
import { WalletProvider } from "./lib/wallet-provider";
import { ThemeProvider } from "./lib/theme-provider";
import { Navbar } from "@/components/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Space Grotesk - 用于 Logo 和标题（Web3 科技感）
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Inter - 用于正文和数字（带等宽数字特性）
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Crypto Dashboard",
  description: "Enterprise-grade cryptocurrency dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 首屏主题脚本：在 React 水合前从 localStorage 恢复主题，避免闪烁
  const themeInitScript = `
(function() {
  try {
    var raw = localStorage.getItem('app-settings');
    if (!raw) return;
    var data = JSON.parse(raw);
    var state = data.state;
    if (!state) return;
    var theme = state.theme;
    var themeColor = state.themeColor || 'blue';
    var root = document.documentElement;
    var effective = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : (theme || 'light');
    if (effective === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    ['blue','green','purple','orange','pink','cyan'].forEach(function(c) {
      root.classList.remove('theme-' + c);
    });
    root.classList.add('theme-' + themeColor);
  } catch (e) {}
})();
  `.trim();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${inter.variable} antialiased`}
      >
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider>
          <QueryProvider>
            <WalletProvider>
              <Navbar />
              {children}
            </WalletProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
