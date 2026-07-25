import { motion } from "motion/react";

export interface Testimonial {
  text: string;
  name: string;
  role: string;
  initials: string;
}

export function TestimonialsColumn(props: {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}) {
  return (
    <div className={props.className}>
      <motion.div
        animate={{ translateY: "-50%" }}
        transition={{
          duration: props.duration || 12,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6 pb-6 bg-background"
      >
        {[...new Array(2)].map((_, dupIdx) => (
          <div key={dupIdx} className="flex flex-col gap-6">
            {props.testimonials.map(({ text, name, role, initials }, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border border-border bg-card shadow-sm max-w-xs w-full"
              >
                <p className="text-sm text-foreground/80 leading-relaxed">{text}</p>
                <div className="flex items-center gap-3 mt-4">
                  <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-semibold">
                    {initials}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm leading-tight">{name}</span>
                    <span className="text-xs text-muted-foreground leading-tight">{role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
