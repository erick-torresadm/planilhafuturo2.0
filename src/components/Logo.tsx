export function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`font-display font-bold leading-none tracking-[-0.03em] text-foreground ${className}`}
      style={{ fontSize: size }}
    >
      planilha
      <span
        className="italic font-extrabold"
        style={{ color: "var(--brand)", fontVariationSettings: '"slnt" -8' }}
      >
        futuro
      </span>
    </span>
  );
}
