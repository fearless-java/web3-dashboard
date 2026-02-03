"use client";

import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * Crypto Dashboard Logo - DeBank 风格
 * 渐变色圆角方形 + 字母 C
 */
export function Logo({ className = "", size = 32 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#logoGradient)" />
      <text
        x="50%"
        y="55%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="white"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="16"
        fontWeight="700"
      >
        C
      </text>
    </svg>
  );
}

/**
 * 小号 Logo (用于 favicon、小图标等)
 */
export function LogoSmall({ className = "" }: Omit<LogoProps, "size">) {
  return <Logo className={className} size={24} />;
}

/**
 * 大号 Logo (用于落地页、品牌展示)
 */
export function LogoLarge({ className = "" }: Omit<LogoProps, "size">) {
  return <Logo className={className} size={48} />;
}
