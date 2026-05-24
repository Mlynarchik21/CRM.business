"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

export type AgentStatus = "active" | "paused" | "error";

export type AgentConfig = {
  id: string;
  name: string;
  topic: string;
  status: AgentStatus;
  provider: string;
  model: string;
  apiKey: string;
  prompt: string;
  skills: string;
  notes: string;
  error: string;
  since: string | null;
};

/** Сохраняет конфигурацию агентов в таблицу settings (ключ "agents"). */
export async function saveAgents(agents: AgentConfig[]): Promise<ActionResult> {
  const supabase = createClient();

  const allowed: AgentStatus[] = ["active", "paused", "error"];
  const clean = agents.map((a) => ({
    id: String(a.id),
    name: String(a.name ?? "").slice(0, 120),
    topic: String(a.topic ?? ""),
    status: (allowed.includes(a.status) ? a.status : "paused") as AgentStatus,
    provider: String(a.provider ?? ""),
    model: String(a.model ?? ""),
    apiKey: String(a.apiKey ?? ""),
    prompt: String(a.prompt ?? ""),
    skills: String(a.skills ?? ""),
    notes: String(a.notes ?? ""),
    error: String(a.error ?? ""),
    since: a.since ? String(a.since) : null,
  }));

  const { error } = await supabase
    .from("settings")
    .upsert(
      { key: "agents", value: clean, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/agents");
  return { ok: true };
}
