import logoSrc from "@/assets/logo-mark.png";

export function Logo({ size = 32, withWordmark = true, className = "" }: { size?: number; withWordmark?: boolean; className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src={logoSrc}
        width={size}
        height={size}
        alt="planilhafuturo"
        className="shrink-0"
        style={{ width: size, height: size }}
      />
      {withWordmark && (
        <span className="font-display font-semibold text-[1.2rem] leading-none tracking-[-0.02em] text-foreground">
          planilha<span className="text-primary italic">futuro</span>
        </span>
      )}
    </div>
  );
}
