import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background font-sans">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-card sm:items-start relative rounded-lg shadow-lg border border-border">
        <div className="absolute top-8 right-8">
          <ThemeToggle />
        </div>
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-foreground">
            Crypto Dashboard - 现代化浅色主题
          </h1>
          <p className="max-w-md text-lg leading-8 text-muted-foreground">
            这是一个现代化的加密货币仪表板，具有清新的浅色主题和可切换的主题色。
            点击右上角的主题切换按钮体验不同的主题色。
          </p>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>✨ 功能特性：</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>清新明亮的浅色主题</li>
              <li>6种可切换的主题色（蓝、绿、紫、橙、粉、青）</li>
              <li>完整的深色模式支持</li>
              <li>响应式设计</li>
              <li>现代化的UI组件</li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-active md:w-[158px]"
            href="/dashboard"
          >
            进入仪表板
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-lg border border-border px-5 transition-colors hover:border-transparent hover:bg-accent md:w-[158px]"
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub 仓库
          </a>
        </div>
      </main>
    </div>
  );
}
