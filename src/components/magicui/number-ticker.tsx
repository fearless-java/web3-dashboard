"use client";

import { ComponentPropsWithoutRef, useEffect, useRef, useState } from "react";
import { useInView, useMotionValue, useSpring } from "motion/react";

import { cn } from "@/lib/utils";

// 模块级别的 Set，用于追踪哪些值已经动画过（组件卸载后仍然保持）
const animatedValues = new Set<string>();

function getValueKey(value: number, decimalPlaces: number): string {
  return `${value.toFixed(decimalPlaces)}-${decimalPlaces}`;
}

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number;
  startValue?: number;
  direction?: "up" | "down";
  delay?: number;
  decimalPlaces?: number;
}

export function NumberTicker({
  value,
  startValue = 0,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === "down" ? value : startValue);
  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 200,
  });
  const isInView = useInView(ref, { once: true, margin: "0px" });
  
  // 使用 ref 来追踪当前值是否已动画，避免重新渲染
  const valueKey = getValueKey(value, decimalPlaces);
  const hasAnimatedRef = useRef(animatedValues.has(valueKey));
  const [displayValue, setDisplayValue] = useState(
    hasAnimatedRef.current ? value : startValue
  );

  useEffect(() => {
    // 如果已经动画过，直接显示最终值
    if (hasAnimatedRef.current) {
      setDisplayValue(value);
      return;
    }

    if (isInView) {
      const timer = setTimeout(() => {
        motionValue.set(direction === "down" ? startValue : value);
        animatedValues.add(valueKey);
        hasAnimatedRef.current = true;
      }, delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [motionValue, isInView, delay, value, direction, startValue, valueKey]);

  useEffect(
    () =>
      springValue.on("change", (latest) => {
        setDisplayValue(Number(latest.toFixed(decimalPlaces)));
      }),
    [springValue, decimalPlaces],
  );

  return (
    <span
      ref={ref}
      className={cn(
        "inline-block tracking-wider text-black tabular-nums dark:text-white",
        className,
      )}
      {...props}
    >
      {Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(displayValue)}
    </span>
  );
}
