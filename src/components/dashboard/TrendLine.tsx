"use client";

import React from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

const SPARKLINE_HEIGHT = 40;
const SPARKLINE_WIDTH = 100;

/** 绿色：上涨 #16a34a */
const STROKE_UP = "#16a34a";
/** 红色：下跌 #dc2626 */
const STROKE_DOWN = "#dc2626";
export interface TrendLineProps {
  /** 7 天价格数组，顺序为 [7d ago, ..., today] */
  data: number[];
  /** 可选：强制涨跌色，不传则根据 data[last] >= data[0] 自动判断 */
  isPositive?: boolean;
  className?: string;
}

/**
 * 微型折线图 (Sparkline) - 7d Trend
 * 极简：无坐标轴、网格、Tooltip、Legend；线条 2px、无点、monotone 平滑
 */
export function TrendLine({ data, isPositive, className }: TrendLineProps) {
  const isEmpty = !data || data.length === 0;

  if (isEmpty) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded bg-muted/50",
          className
        )}
        style={{ width: SPARKLINE_WIDTH, height: SPARKLINE_HEIGHT }}
        aria-hidden
      >
        <svg
          width="60%"
          height="24"
          viewBox="0 0 60 24"
          fill="none"
          className="text-muted-foreground/60"
        >
          <path
            d="M0 12 Q15 4 30 12 T60 12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  const last = data.length - 1;
  const autoPositive = data[last] >= data[0];
  const up = isPositive !== undefined ? isPositive : autoPositive;
  const strokeColor = up ? STROKE_UP : STROKE_DOWN;

  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <div
      className={cn("overflow-hidden rounded", className)}
      style={{ width: SPARKLINE_WIDTH, height: SPARKLINE_HEIGHT }}
      aria-hidden
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
        >
          <YAxis type="number" domain={["auto", "auto"]} hide width={0} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
            animationDuration={300}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
