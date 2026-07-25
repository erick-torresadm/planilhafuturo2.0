export function GradientOrbs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="lp-orb-mint absolute -top-20 -left-24 h-[520px] w-[520px] rounded-full" />
      <div className="lp-orb-cyan absolute top-40 -right-32 h-[560px] w-[560px] rounded-full" />
      <div className="lp-noise absolute inset-0" />
    </div>
  );
}
