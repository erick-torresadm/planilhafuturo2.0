import logoSrc from "@/assets/logo-planilhafuturo.png";

export function Logo({ size = 32, withWordmark = true, className = "" }: { size?: number; withWordmark?: boolean; className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <img src={logoSrc} width={size} height={size} alt="planilhafuturo" className="shrink-0" />
      {withWordmark && (
        <span className="font-display text-[1.35rem] leading-none tracking-tight text-foreground">
          planilhafuturo
        </span>
      )}
    </div>
  );
}
