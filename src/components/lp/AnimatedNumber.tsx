import { useEffect, useRef } from "react";
import { animate, useInView, useMotionValue, useTransform } from "motion/react";

export function AnimatedNumber({
  to,
  prefix = "",
  suffix = "",
  duration = 1.6,
  className = "",
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString("pt-BR"));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, to, { duration, ease: [0.22, 1, 0.36, 1] });
    return controls.stop;
  }, [inView, to, duration, mv]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return rounded.on("change", (v) => {
      el.textContent = `${prefix}${v}${suffix}`;
    });
  }, [rounded, prefix, suffix]);

  return <span ref={ref} className={className}>{prefix}0{suffix}</span>;
}
