import { AgentsClient } from "@/components/agents/AgentsClient";
import type { AgentConfig, AgentStatus } from "@/app/(dashboard)/agents/actions";
import { createClient } from "@/lib/supabase/server";

function normalizeAgent(raw: unknown): AgentConfig {
  const a = (raw ?? {}) as Record<string, unknown>;
  const status = a.status === "active" || a.status === "error" ? (a.status as AgentStatus) : "paused";
  return {
    id: String(a.id ?? Math.random().toString(36).slice(2, 10)),
    name: String(a.name ?? ""),
    topic: String(a.topic ?? "custom"),
    status,
    provider: String(a.provider ?? "anthropic"),
    model: String(a.model ?? ""),
    apiKey: String(a.apiKey ?? ""),
    prompt: String(a.prompt ?? ""),
    skills: String(a.skills ?? ""),
    notes: String(a.notes ?? ""),
    error: String(a.error ?? ""),
    since: a.since ? String(a.since) : null,
  };
}

export default async function AgentsPage() {
  const supabase = createClient();

  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "agents")
    .maybeSingle<{ value: unknown }>();

  const initialAgents: AgentConfig[] = Array.isArray(data?.value)
    ? (data!.value as unknown[]).map(normalizeAgent)
    : [];

  return <AgentsClient initialAgents={initialAgents} />;
}
