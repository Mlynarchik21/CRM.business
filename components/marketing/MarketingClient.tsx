"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ExternalLink, Lightbulb, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import {
  saveMarketingSources,
  type MarketingSource,
} from "@/app/(dashboard)/marketing/actions";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

export type TrafficStat = {
  source: string;
  label: string;
  leads: number;
  clients: number;
  conversion: number;
  revenue: number;
  spend: number;
  costPerLead: number;
};

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
}

type Channel = {
  id: string;
  label: string;
  recommendation: string;
  tool: string;
  apiWhere: string;
  apiUrl: string;
  insertWhere: string;
};

const PLAYBOOK: Channel[] = [
  { id: "telegram", label: "Telegram", recommendation: "Лид-бот для заявок + агент авто-сообщений для прогрева базы.", tool: "Telegram Bot API + агент «Авто-сообщения»", apiWhere: "@BotFather → /newbot → токен", apiUrl: "https://t.me/BotFather", insertWhere: "Агенты → провайдер Telegram" },
  { id: "instagram", label: "Instagram", recommendation: "Ответы в Директ и на комментарии через агента.", tool: "Instagram Graph API (Meta) + агент", apiWhere: "developers.facebook.com → app → Instagram", apiUrl: "https://developers.facebook.com/", insertWhere: "Настройки → Подключения → добавить API" },
  { id: "cold_search", label: "Холодный поиск", recommendation: "Агент собирает лидов по нишам и запросам.", tool: "Агент «Холодный поиск»", apiWhere: "Ключи задаются в карточке агента", apiUrl: "", insertWhere: "Агенты → Холодный поиск" },
  { id: "ads", label: "Реклама (таргет/контекст)", recommendation: "Размечай ссылки UTM — источник попадёт в лида и аналитику.", tool: "UTM-метки + форма лендинга", apiWhere: "Кабинет рекламной площадки", apiUrl: "", insertWhere: "Лендинг → webhook /api/webhooks" },
  { id: "landing", label: "Лендинг / сайт", recommendation: "Подключи форму к вебхуку — заявки станут лидами.", tool: "Webhook приёма заявок", apiWhere: "Адрес вебхука — Настройки → API", apiUrl: "", insertWhere: "Настройки → API → /api/webhooks" },
  { id: "referral", label: "Рекомендации", recommendation: "Отмечай источником «Рекомендация» — увидишь конверсию.", tool: "Ручное добавление / реф-ссылка", apiWhere: "—", apiUrl: "", insertWhere: "Лиды → создать с источником «Рекомендация»" },
];

function channelMeta(id: string) {
  return PLAYBOOK.find((c) => c.id === id) ?? PLAYBOOK[0];
}

const STATUS_META: Record<MarketingSource["status"], { label: string; color: string }> = {
  active: { label: "Активен", color: COLORS.accentGreen },
  planned: { label: "Запланирован", color: COLORS.warning },
  paused: { label: "На паузе", color: COLORS.textMuted },
};

function emptySource(): MarketingSource {
  return { id: makeId(), name: "Telegram", channel: "telegram", status: "planned", budget: "", notes: "" };
}

// ── Форма источника ───────────────────────────────────────────
function SourceFormDialog({
  open,
  onOpenChange,
  source,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: MarketingSource | null;
  onSave: (s: MarketingSource) => void;
}) {
  const [draft, setDraft] = useState<MarketingSource>(emptySource());

  useEffect(() => {
    if (open) setDraft(source ?? emptySource());
  }, [open, source]);

  const ch = channelMeta(draft.channel);

  function field<K extends keyof MarketingSource>(key: K, value: MarketingSource[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    if (!draft.name.trim()) {
      toast.error("Укажи название источника");
      return;
    }
    onSave(draft);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{source ? "Источник трафика" : "Новый источник трафика"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Канал</Label>
              <Select
                value={draft.channel}
                onValueChange={(v) => {
                  const meta = channelMeta(v);
                  setDraft((prev) => ({ ...prev, channel: v, name: prev.name || meta.label }));
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLAYBOOK.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={draft.status} onValueChange={(v) => field("status", v as MarketingSource["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Активен</SelectItem>
                  <SelectItem value="planned">Запланирован</SelectItem>
                  <SelectItem value="paused">На паузе</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={draft.name} onChange={(e) => field("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Бюджет / план</Label>
              <Input value={draft.budget} onChange={(e) => field("budget", e.target.value)} placeholder="$300 / мес" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Заметки</Label>
            <Textarea value={draft.notes} onChange={(e) => field("notes", e.target.value)} rows={2} />
          </div>

          {/* Подсказка CRM по каналу */}
          <div className="space-y-2 rounded-lg bg-[#1B1B1F] p-3 text-xs text-muted-foreground">
            <p className="flex items-start gap-2">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" />
              {ch.recommendation}
            </p>
            <p className="flex items-start gap-2">
              <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Инструмент: {ch.tool}
            </p>
            <p className="flex flex-wrap items-center gap-1">
              <span className="font-medium text-foreground">Где взять API:</span> {ch.apiWhere}
              {ch.apiUrl && (
                <a href={ch.apiUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  открыть <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </p>
            <p>
              <span className="font-medium text-foreground">Куда вставить:</span> {ch.insertWhere}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={submit}>{source ? "Сохранить" : "Добавить"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MarketingClient({
  initialSources,
  trafficStats,
  totalLeads,
}: {
  initialSources: MarketingSource[];
  trafficStats: TrafficStat[];
  totalLeads: number;
}) {
  const router = useRouter();
  const [sources, setSources] = useState<MarketingSource[]>(initialSources);
  const [pending, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [formSource, setFormSource] = useState<MarketingSource | null>(null);
  const [openSource, setOpenSource] = useState<string | null>(null);

  function persist(next: MarketingSource[], okMsg?: string) {
    const prev = sources;
    setSources(next);
    startTransition(async () => {
      const result = await saveMarketingSources(next);
      if (!result.ok) {
        toast.error(result.error);
        setSources(prev);
        return;
      }
      if (okMsg) toast.success(okMsg);
      router.refresh();
    });
  }

  function upsert(s: MarketingSource) {
    const exists = sources.some((x) => x.id === s.id);
    persist(
      exists ? sources.map((x) => (x.id === s.id ? s : x)) : [...sources, s],
      exists ? "Источник обновлён" : "Источник добавлен",
    );
  }

  function remove(id: string) {
    persist(sources.filter((s) => s.id !== id), "Источник удалён");
  }

  const activeCount = sources.filter((s) => s.status === "active").length;
  const topSource = trafficStats[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Маркетинг</h1>
          <p className="text-muted-foreground">
            Статистика трафика и источники. По каждому каналу CRM подсказывает инструмент и где взять API.
          </p>
        </div>
        <Button
          onClick={() => {
            setFormSource(null);
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
          <p className="text-sm text-muted-foreground">Лидов всего</p>
          <p className="mt-2 text-2xl font-semibold">{formatNumber(totalLeads)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Источников</p>
          <p className="mt-2 text-2xl font-semibold">{sources.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Активных</p>
          <p className="mt-2 text-2xl font-semibold text-primary">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Топ-источник</p>
          <p className="mt-2 text-lg font-semibold">{topSource ? topSource.label : "—"}</p>
          {topSource && (
            <p className="mt-1 text-xs text-muted-foreground">{topSource.leads} лидов</p>
          )}
        </div>
      </div>

      {/* Трафик по источникам */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-[minmax(0,1.6fr)_100px_100px_120px] gap-4 border-b border-border px-4 py-3 text-sm text-muted-foreground">
            <div>Источник</div>
            <div>Лидов</div>
            <div>Клиентов</div>
            <div>Конверсия</div>
          </div>
          {trafficStats.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Пока нет лидов с источниками — данные появятся, когда пойдёт трафик.
            </div>
          ) : (
            trafficStats.map((s) => {
              const isOpen = openSource === s.source;
              return (
                <div key={s.source} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setOpenSource(isOpen ? null : s.source)}
                    className="grid w-full grid-cols-[minmax(0,1.6fr)_100px_100px_120px_32px] items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-[#1B1B1F]"
                  >
                    <span className="truncate font-medium">{s.label}</span>
                    <span className="text-sm text-muted-foreground">{formatNumber(s.leads)}</span>
                    <span className="text-sm text-muted-foreground">{formatNumber(s.clients)}</span>
                    <span className="text-sm font-medium text-primary">{s.conversion}%</span>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && (
                    <div className="grid gap-3 px-4 pb-4 sm:grid-cols-4">
                      <div className="rounded-lg bg-[#1B1B1F] p-3">
                        <p className="text-xs text-muted-foreground">Выручка с источника</p>
                        <p className="mt-1 text-sm font-semibold text-primary">{formatCurrency(s.revenue)}</p>
                      </div>
                      <div className="rounded-lg bg-[#1B1B1F] p-3">
                        <p className="text-xs text-muted-foreground">Расход</p>
                        <p className="mt-1 text-sm font-semibold text-destructive">{formatCurrency(s.spend)}</p>
                      </div>
                      <div className="rounded-lg bg-[#1B1B1F] p-3">
                        <p className="text-xs text-muted-foreground">Цена лида</p>
                        <p className="mt-1 text-sm font-semibold">{s.leads > 0 && s.spend > 0 ? formatCurrency(s.costPerLead) : "—"}</p>
                      </div>
                      <div className="rounded-lg bg-[#1B1B1F] p-3">
                        <p className="text-xs text-muted-foreground">ROI</p>
                        <p className="mt-1 text-sm font-semibold">
                          {s.spend > 0 ? `${Math.round(((s.revenue - s.spend) / s.spend) * 100)}%` : "—"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Мои источники */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Мои источники</h2>
        {sources.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Источников пока нет. Нажми «Добавить», чтобы подключить канал.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sources.map((source) => {
              const ch = channelMeta(source.channel);
              const statusMeta = STATUS_META[source.status];
              return (
                <Card key={source.id}>
                  <CardContent className="flex flex-wrap items-center gap-3 p-4">
                    <StatusBadge label={ch.label} color={COLORS.accentPurple} />
                    <span className="font-medium">{source.name}</span>
                    <StatusBadge label={statusMeta.label} color={statusMeta.color} />
                    {source.budget && (
                      <span className="text-xs text-muted-foreground">{source.budget}</span>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { setFormSource(source); setFormOpen(true); }}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Редактировать"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(source.id)}
                        disabled={pending}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Удалить"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {source.notes && (
                      <p className={cn("w-full text-xs text-muted-foreground")}>{source.notes}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <SourceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        source={formSource}
        onSave={upsert}
      />
    </div>
  );
}
