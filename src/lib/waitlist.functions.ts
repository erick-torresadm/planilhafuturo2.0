import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  source: z.string().max(64).optional(),
});

export const joinWaitlist = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { error } = await supabase.from("waitlist").insert({
      email: data.email.toLowerCase().trim(),
      source: data.source ?? "landing",
    });
    if (error && !/duplicate|unique/i.test(error.message)) {
      throw new Error(error.message);
    }
    return { ok: true };
  });
