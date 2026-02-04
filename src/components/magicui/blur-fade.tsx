"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import {
  AnimatePresence,
  motion,
  MotionProps,
  useInView,
  UseInViewOptions,
  Variants,
} from "motion/react";

type MarginType = UseInViewOptions["margin"];

interface BlurFadeProps extends MotionProps {
  children: React.ReactNode;
  className?: string;
  variant?: {
    hidden: { y: number };
    visible: { y: number };
  };
  duration?: number;
  delay?: number;
  offset?: number;
  direction?: "up" | "down" | "left" | "right";
  inView?: boolean;
  inViewMargin?: MarginType;
  blur?: string;
  as?: React.ElementType;
}

export function BlurFade({
  children,
  className,
  variant,
  duration = 0.4,
  delay = 0,
  offset = 6,
  direction = "down",
  inView = false,
  inViewMargin = "-50px",
  blur = "6px",
  as: Component = "div",
  ...props
}: BlurFadeProps) {
  const ref = useRef(null);
  const inViewResult = useInView(ref, { once: true, margin: inViewMargin });
  const isInView = !inView || inViewResult;
  // 追踪动画是否已经执行过，避免重新聚焦时重新动画
  const [hasAnimated, setHasAnimated] = useState(false);

  // 当首次进入视口时标记动画已执行
  useEffect(() => {
    if (isInView && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [isInView, hasAnimated]);

  const defaultVariants: Variants = {
    hidden: {
      [direction === "left" || direction === "right" ? "x" : "y"]:
        direction === "right" || direction === "down" ? -offset : offset,
      opacity: 0,
      filter: `blur(${blur})`,
    },
    visible: {
      [direction === "left" || direction === "right" ? "x" : "y"]: 0,
      opacity: 1,
      filter: `blur(0px)`,
    },
  };
  const combinedVariants = variant || defaultVariants;
  const MotionComponent = useMemo(() => {
    if (typeof Component === "string") {
      return (motion as any)[Component] || motion.div;
    }
    return motion.create(Component);
  }, [Component]);

  // 如果已经动画过，直接显示最终状态，不使用动画
  if (hasAnimated) {
    return (
      <Component className={className} {...props}>
        {children}
      </Component>
    );
  }

  return (
    <AnimatePresence>
      <MotionComponent
        ref={ref}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        exit="hidden"
        variants={combinedVariants}
        transition={{
          delay: 0.04 + delay,
          duration,
          ease: "easeOut",
        }}
        className={className}
        {...props}
      >
        {children}
      </MotionComponent>
    </AnimatePresence>
  );
}
