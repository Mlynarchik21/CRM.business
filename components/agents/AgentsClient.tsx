"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bot,
  ChevronDown,
  Copy,
  ExternalLink,
  Pause,
  Play,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  saveAgents,
  type AgentConfig,
  type AgentStatus,
} from "@/app/(dashboard)/agents/actions";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { COLORS } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
}

const TOPIC_LABEL: Record<string, string> = {
  sales: "Продажи",
  support: "Поддержка",
  cold_search: "Холодный поиск",
  outreach: "Авто-сообщения",
  content: "Контент",
  analytics: "Аналитика",
  custom: "Другое",
};

const PROVIDERS: { value: string; label: string; keyHint: string; url: string }[] = [
  { value: "anthropic", label: "Anthropic (Claude)", keyHint: "console.anthropic.com → API Keys", url: "https://console.anthropic.com/settings/keys" },
  { value: "openai", label: "OpenAI (GPT)", keyHint: "platform.openai.com → API keys", url: "https://platform.openai.com/api-keys" },
  { value: "telegram", label: "Telegram Bot", keyHint: "@BotFather → /newbot → токен", url: "https://t.me/BotFather" },
  { value: "custom", label: "Свой / другой API", keyHint: "Ключ из личного кабинета сервиса", url: "" },
];

const STATUS_META: Record<AgentStatus, { label: string; color: string }> = {
  active: { label: "Работает", color: COLORS.accentGreen },
  paused: { label: "На паузе", color: COLORS.textMuted },
  error: { label: "Ошибка", color: COLORS.danger },
};

function providerMeta(value: string) {
  return PROVIDERS.find((p) => p.value === value) ?? PROVIDERS[3];
}
function providerLabel(value: string) {
  return providerMeta(value).label;
}
function maskKey(key: string) {
  if (!key) return "не задан";
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}
function emptyAgent(): AgentConfig {
  return {
    id: makeId(),
    name: "",
    topic: "sales",
    status: "paused",
    provider: "anthropic",
    model: "",
    apiKey: "",
    prompt: "",
    skills: "",
    notes: "",
    error: "",
    since: null,
  };
}

function copy(text: string) {
  navigator.clipboard?.writeText(text).then(
    () => toast.success("Скопировано"),
    () => toast.error("Не удалось скопировать"),
  );
}

// ── Форма добавления/редактирования агента ────────────────────
function AgentFormDialog({
  open,
  onOpenChange,
  agent,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: AgentConfig | null;
  onSave: (agent: AgentConfig) => void;
}) {
  const [draft, setDraft] = useState<AgentConfig>(emptyAgent());

  useEffect(() => {
    if (open) setDraft(agent ?? emptyAgent());
  }, [open, agent]);

  const meta = providerMeta(draft.provider);

  function field<K extends keyof AgentConfig>(key: K, value: AgentConfig[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    if (!draft.name.trim()) {
      toast.error("Укажи название агента");
      return;
    }
    onSave(draft);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{agent ? "Настройки агента" : "Новый агент"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={draft.name} onChange={(e) => field("name", e.target.value)} placeholder="Агент продаж" />
            </div>
            <div className="space-y-2">
              <Label>Тема</Label>
              <Select value={draft.topic} onValueChange={(v) => field("topic", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TOPIC_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Провайдер</Label>
              <Select value={draft.provider} onValueChange={(v) => field("provider", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Модель / бот</Label>
              <Input
                value={draft.model}
                onChange={(e) => field("model", e.target.value)}
                placeholder={draft.provider === "telegram" ? "@my_bot" : "claude-opus-4-7 / gpt-4o"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>API-ключ / токен</Label>
            <Input
              type="password"
              value={draft.apiKey}
              onChange={(e) => field("apiKey", e.target.value)}
              placeholder="Вставь ключ"
            />
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              Где взять: {meta.keyHint}
              {meta.url && (
                <a href={meta.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  открыть <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Промпт / роль</Label>
            <Textarea value={draft.prompt} onChange={(e) => field("prompt", e.target.value)} rows={4} placeholder="Системный промпт: кто агент, тон, цель, ограничения" />
          </div>

          <div className="space-y-2">
            <Label>Скилы / инструменты</Label>
            <Textarea value={draft.skills} onChange={(e) => field("skills", e.target.value)} rows={2} placeholder="Через запятую: поиск по нишам, ответы в Директ, выставление КП…" />
          </div>

          <div className="space-y-2">
            <Label>Заметки</Label>
            <Textarea value={draft.notes} onChange={(e) => field("notes", e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={submit}>{agent ? "Сохранить" : "Добавить"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AgentsClient({ initialAgents }: { initialAgents: AgentConfig[] }) {
  const router = useRouter();
  const [agents, setAgents] = useState<AgentConfig[]>(initialAgents);
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formAgent, setFormAgent] = useState<AgentConfig | null>(null);

  function persist(next: AgentConfig[], okMsg?: string) {
    const prev = agents;
    setAgents(next);
    startTransition(async () => {
      const result = await saveAgents(next);
      if (!result.ok) {
        toast.error(result.error);
        setAgents(prev);
        return;
      }
      if (okMsg) toast.success(okMsg);
      router.refresh();
    });
  }

  function upsertAgent(agent: AgentConfig) {
    const exists = agents.some((a) => a.id === agent.id);
    const next = exists
      ? agents.map((a) => (a.id === agent.id ? agent : a))
      : [...agents, agent];
    persist(next, exists ? "Агент обновлён" : "Агент добавлен");
  }

  function setStatus(id: string, status: AgentStatus) {
    persist(
      agents.map((a) =>
        a.id === id
          ? {
              ...a,
              status,
              since: status === "active" && a.status !== "active" ? new Date().toISOString() : a.since,
              error: status === "error" ? a.error : "",
            }
          : a,
      ),
    );
  }

  function remove(id: string) {
    persist(agents.filter((a) => a.id !== id), "Агент удалён");
  }

  const working = agents.filter((a) => a.status === "active").length;
  const paused = agents.filter((a) => a.status === "paused").length;
  const errored = agents.filter((a) => a.status === "error").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Агенты</h1>
          <p className="text-muted-foreground">
            ИИ-агенты по темам: следим за работой, статусами и ошибками, настраиваем промпт, скилы и API.
          </p>
        </div>
        <Button
          onClick={() => {
            setFormAgent(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Добавить
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Всего</p>
          <p className="mt-2 text-2xl font-semibold">{agents.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Работает</p>
          <p className="mt-2 text-2xl font-semibold text-primary">{working}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">На паузе</p>
          <p className="mt-2 text-2xl font-semibold">{paused}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">С ошибкой</p>
          <p className="mt-2 text-2xl font-semibold text-destructive">{errored}</p>
        </div>
      </div>

      {/* Список агентов */}
      {agents.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Агентов пока нет. Нажми «Добавить», чтобы подключить первого.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => {
            const isOpen = expanded === agent.id;
            const statusMeta = STATUS_META[agent.status];
            return (
              <Card key={agent.id} className={cn(agent.status === "error" && "border-destructive/40")}>
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Bot className="h-4 w-4" />
                    </span>
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : agent.id)}
                      className="flex min-w-0 flex-1 flex-col items-start text-left"
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{agent.name || "Без названия"}</span>
                        <StatusBadge label={TOPIC_LABEL[agent.topic] ?? "Другое"} color={COLORS.accentPurple} />
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {agent.status === "active" && agent.since
                          ? `Работает с ${formatDate(agent.since, true)}`
                          : providerLabel(agent.provider)}
                      </span>
                    </button>

                    <StatusBadge label={statusMeta.label} color={statusMeta.color} />

                    {agent.status === "active" ? (
                      <Button size="sm" variant="outline" onClick={() => setStatus(agent.id, "paused")} disabled={pending}>
                        <Pause className="mr-1 h-3.5 w-3.5" /> Пауза
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => setStatus(agent.id, "active")} disabled={pending}>
                        <Play className="mr-1 h-3.5 w-3.5" /> Запустить
                      </Button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setFormAgent(agent);
                        setFormOpen(true);
                      }}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label="Настройки"
                    >
                      <Settings2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : agent.id)}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                    </button>
                  </div>

                  {isOpen && (
                    <div className="space-y-3 border-t border-border p-4 text-sm">
                      {agent.status === "error" && agent.error && (
                        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 font-medium text-destructive">
                              <AlertTriangle className="h-4 w-4" /> Ошибка
                            </span>
                            <Button size="sm" variant="outline" onClick={() => copy(agent.error)}>
                              <Copy className="mr-1 h-3.5 w-3.5" /> Скопировать
                            </Button>
                          </div>
                          <pre className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
                            {agent.error}
                          </pre>
                        </div>
                      )}

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg bg-[#1B1B1F] p-3">
                          <p className="text-xs text-muted-foreground">Провайдер / модель</p>
                          <p className="mt-1 font-medium">
                            {providerLabel(agent.provider)}
                            {agent.model ? ` · ${agent.model}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-2 rounded-lg bg-[#1B1B1F] p-3">
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">API-ключ</p>
                            <p className="mt-1 truncate font-mono text-xs">{maskKey(agent.apiKey)}</p>
                          </div>
                          {agent.apiKey && (
                            <Button size="sm" variant="outline" onClick={() => copy(agent.apiKey)}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {agent.prompt && (
                        <div>
                          <p className="text-xs text-muted-foreground">Промпт</p>
                          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{agent.prompt}</p>
                        </div>
                      )}
                      {agent.skills && (
                        <div>
                          <p className="text-xs text-muted-foreground">Скилы</p>
                          <p className="mt-1 text-muted-foreground">{agent.skills}</p>
                        </div>
                      )}
                      {agent.notes && (
                        <div>
                          <p className="text-xs text-muted-foreground">Заметки</p>
                          <p className="mt-1 text-muted-foreground">{agent.notes}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button size="sm" variant="outline" onClick={() => { setFormAgent(agent); setFormOpen(true); }}>
                          <Settings2 className="mr-1 h-3.5 w-3.5" /> Редактировать
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setStatus(agent.id, "error")} disabled={pending}>
                          Пометить ошибку
                        </Button>
                        <button
                          type="button"
                          onClick={() => remove(agent.id)}
                          className="ml-auto inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" /> Удалить
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AgentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        agent={formAgent}
        onSave={upsertAgent}
      />
    </div>
  );
}
