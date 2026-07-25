import { useRef, type ReactNode, type MouseEvent } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "motion/react";

export function TiltCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [6, -6]), { stiffness: 120, damping: 15 });
  const ry = useSpring(useTransform(px, [0, 1], [-8, 8]), { stiffness: 120, damping: 15 });
  const glowX = useTransform(px, (v) => `${v * 100}%`);
  const glowY = useTransform(py, (v) => `${v * 100}%`);

  function onMove(e: MouseEvent) {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  }
  function reset() { px.set(0.5); py.set(0.5); }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200 }}
      className={`relative ${className}`}
    >
      <motion.div
        aria-hidden
        style={{
          background: `radial-gradient(400px circle at ${glowX.get()} ${glowY.get()}, rgba(115,255,184,0.18), transparent 60%)`,
        }}
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-70"
      />
      {children}
    </motion.div>
  );
}
