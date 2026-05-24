"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

export type MarketingSource = {
  id: string;
  name: string;
  channel: string;
  status: "active" | "planned" | "paused";
  budget: string;
  notes: string;
};

/** Сохраняет источники трафика в settings (ключ "marketing_sources"). */
export async function saveMarketingSources(
  sources: MarketingSource[],
): Promise<ActionResult> {
  const supabase = createClient();

  const clean = sources.map((s) => ({
    id: String(s.id),
    name: String(s.name ?? "").slice(0, 120),
    channel: String(s.channel ?? ""),
    status: (["active", "planned", "paused"].includes(s.status) ? s.status : "planned") as
      | "active"
      | "planned"
      | "paused",
    budget: String(s.budget ?? ""),
    notes: String(s.notes ?? ""),
  }));

  const { error } = await supabase
    .from("settings")
    .upsert(
      { key: "marketing_sources", value: clean, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/marketing");
  revalidatePath("/analytics");
  return { ok: true };
}
