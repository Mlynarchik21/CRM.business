"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  Check,
  Copy,
  History,
  KeyRound,
  Palette,
  Plug,
  Settings2,
  Tag,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import {
  createLabel,
  deleteLabel,
  markErrorChecked,
  saveChangelog,
  updateMyProfile,
  upsertSetting,
  type ChangelogEntry,
} from "@/app/(dashboard)/settings/actions";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ACCENT_PRESETS,
  type AccentKey,
  type DensityKey,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Label as LabelRow } from "@/types";

type Integration = { label: string; configured: boolean };

export type ExternalConnection = {
  id: string;
  name: string;
  base_url: string;
  api_key: string;
  status: "active" | "inactive";
};

export type ErrorLogRow = {
  id: string;
  title: string;
  detail: string | null;
  route: string | null;
  status: "open" | "fixed";
  created_at: string;
  fixed_at: string | null;
};

export type SettingsData = {
  profile: { full_name: string; telegram_username: string };
  company: { company_name: string; default_currency: string };
  labels: LabelRow[];
  appearance: { accent: AccentKey; density: DensityKey };
  integrations: Integration[];
  connections: ExternalConnection[];
  errors: ErrorLogRow[];
  changelog: ChangelogEntry[];
  appUrl: string;
  webhookSecretSet: boolean;
};

type SectionKey =
  | "profile"
  | "company"
  | "design"
  | "labels"
  | "connections"
  | "api"
  | "journal"
  | "advanced";

const SECTIONS: { key: SectionKey; label: string; icon: typeof User; hint: string }[] = [
  { key: "profile", label: "Профиль", icon: User, hint: "Ваше имя и контакты" },
  { key: "company", label: "Компания", icon: Building2, hint: "Название и валюта" },
  { key: "design", label: "Дизайн", icon: Palette, hint: "Акцент и плотность" },
  { key: "labels", label: "Лейблы", icon: Tag, hint: "Цветные метки" },
  { key: "connections", label: "Подключения", icon: Plug, hint: "Статус интеграций" },
  { key: "api", label: "API", icon: KeyRound, hint: "Вебхуки и ключи" },
  { key: "journal", label: "Журнал", icon: History, hint: "Ошибки и обновления" },
  { key: "advanced", label: "Расширенные", icon: Settings2, hint: "Доп. параметры" },
];

function SectionShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function SettingsClient({ data }: { data: SettingsData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<SectionKey>("profile");

  // Профиль
  const [fullName, setFullName] = useState(data.profile.full_name);
  const [tg, setTg] = useState(data.profile.telegram_username);
  // Компания
  const [companyName, setCompanyName] = useState(data.company.company_name);
  const [currency, setCurrency] = useState(data.company.default_currency);
  // Дизайн
  const [accent, setAccent] = useState<AccentKey>(data.appearance.accent);
  const [density, setDensity] = useState<DensityKey>(data.appearance.density);
  // Лейблы
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState("#22C55E");
  // Сторонние подключения (API)
  const [connections, setConnections] = useState<ExternalConnection[]>(data.connections);
  const [connName, setConnName] = useState("");
  const [connUrl, setConnUrl] = useState("");
  const [connKey, setConnKey] = useState("");

  function persistConnections(next: ExternalConnection[]) {
    const prev = connections;
    setConnections(next);
    startTransition(async () => {
      const r = await upsertSetting("connections", next);
      if (!r.ok) {
        toast.error(r.error);
        setConnections(prev);
        return;
      }
      toast.success("Подключения сохранены");
      router.refresh();
    });
  }

  function addConnection() {
    if (!connName.trim()) {
      toast.error("Укажи название подключения");
      return;
    }
    persistConnections([
      ...connections,
      {
        id: globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10),
        name: connName.trim(),
        base_url: connUrl.trim(),
        api_key: connKey.trim(),
        status: "active",
      },
    ]);
    setConnName("");
    setConnUrl("");
    setConnKey("");
  }

  // Журнал
  const [journalTab, setJournalTab] = useState<"errors" | "updates">("errors");
  const [changelog, setChangelog] = useState<ChangelogEntry[]>(data.changelog);
  const [clNumber, setClNumber] = useState("");
  const [clDesc, setClDesc] = useState("");
  const [clOpen, setClOpen] = useState(false);

  function checkError(id: string) {
    startTransition(async () => {
      const r = await markErrorChecked(id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Отмечено как исправлено");
      router.refresh();
    });
  }

  function persistChangelog(next: ChangelogEntry[]) {
    const prev = changelog;
    setChangelog(next);
    startTransition(async () => {
      const r = await saveChangelog(next);
      if (!r.ok) {
        toast.error(r.error);
        setChangelog(prev);
        return;
      }
      toast.success("Журнал обновлён");
      router.refresh();
    });
  }

  function addChangelogEntry() {
    if (!clDesc.trim()) {
      toast.error("Опишите изменение");
      return;
    }
    const autoNumber = clNumber.trim() || `#${changelog.length + 1}`;
    persistChangelog([
      {
        id: globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10),
        number: autoNumber,
        description: clDesc.trim(),
        created_at: new Date().toISOString(),
      },
      ...changelog,
    ]);
    setClNumber("");
    setClDesc("");
    setClOpen(false);
  }

  function fmtDateTime(value: string) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function saveProfile() {
    startTransition(async () => {
      const r = await updateMyProfile({ full_name: fullName, telegram_username: tg });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Профиль сохранён");
      router.refresh();
    });
  }

  function saveCompany() {
    startTransition(async () => {
      const r1 = await upsertSetting("company_name", companyName);
      const r2 = await upsertSetting("default_currency", currency);
      if (!r1.ok || !r2.ok) {
        toast.error((!r1.ok && r1.error) || (!r2.ok && r2.error) || "Ошибка");
        return;
      }
      toast.success("Настройки компании сохранены");
      router.refresh();
    });
  }

  function saveDesign(nextAccent: AccentKey, nextDensity: DensityKey) {
    startTransition(async () => {
      const r1 = await upsertSetting("ui_accent", nextAccent);
      const r2 = await upsertSetting("ui_density", nextDensity);
      if (!r1.ok || !r2.ok) {
        toast.error("Не удалось сохранить дизайн");
        return;
      }
      toast.success("Дизайн сохранён");
      router.refresh();
    });
  }

  function addLabel() {
    if (!labelName.trim()) return;
    startTransition(async () => {
      const r = await createLabel({ name: labelName, color: labelColor, type: "custom" });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Лейбл добавлен");
      setLabelName("");
      router.refresh();
    });
  }

  function removeLabel(id: string) {
    startTransition(async () => {
      const r = await deleteLabel(id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Лейбл удалён");
      router.refresh();
    });
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text).then(
      () => toast.success("Скопировано"),
      () => toast.error("Не удалось скопировать"),
    );
  }

  const webhookBase = data.appUrl || "https://your-app.vercel.app";
  const webhooks = [
    { label: "Lead Bot", url: `${webhookBase}/api/telegram/lead-bot` },
    { label: "Support Bot", url: `${webhookBase}/api/telegram/support-bot` },
    { label: "Internal Bot", url: `${webhookBase}/api/telegram/internal-bot` },
    { label: "Внешние вебхуки", url: `${webhookBase}/api/webhooks` },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      {/* Левый столбик разделов */}
      <nav className="flex flex-col gap-1 lg:sticky lg:top-0 lg:h-fit">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = active === section.key;
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => setActive(section.key)}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                isActive
                  ? "border-border bg-card"
                  : "border-transparent hover:bg-card/60",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span className="min-w-0">
                <span className={cn("block text-sm", isActive ? "font-medium" : "")}>
                  {section.label}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {section.hint}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* Контент активного раздела */}
      <div className="space-y-4">
        {active === "profile" && (
          <SectionShell title="Профиль" description="Имя и Telegram отображаются в интерфейсе CRM.">
            <div className="max-w-md space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Имя</Label>
                <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tg">Telegram</Label>
                <Input id="tg" value={tg} onChange={(e) => setTg(e.target.value)} placeholder="@username" />
              </div>
              <Button onClick={saveProfile} disabled={pending}>
                Сохранить профиль
              </Button>
            </div>
          </SectionShell>
        )}

        {active === "company" && (
          <SectionShell title="Компания" description="Название студии и валюта по умолчанию.">
            <div className="max-w-md space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Название</Label>
                <Input id="company_name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Валюта по умолчанию</Label>
                <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="USD" />
              </div>
              <Button onClick={saveCompany} disabled={pending}>
                Сохранить
              </Button>
            </div>
          </SectionShell>
        )}

        {active === "design" && (
          <SectionShell title="Дизайн" description="Акцентный цвет применяется ко всему интерфейсу.">
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Акцентный цвет</Label>
                <div className="flex flex-wrap gap-3">
                  {(Object.keys(ACCENT_PRESETS) as AccentKey[]).map((key) => {
                    const preset = ACCENT_PRESETS[key];
                    const selected = accent === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setAccent(key);
                          saveDesign(key, density);
                        }}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                          selected ? "border-primary" : "border-border hover:bg-card/60",
                        )}
                      >
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded-full"
                          style={{ backgroundColor: preset.hex }}
                        >
                          {selected && <Check className="h-3 w-3 text-white" />}
                        </span>
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Цвет сохранится и применится после обновления страницы.
                </p>
              </div>

              <div className="space-y-3">
                <Label>Плотность интерфейса</Label>
                <div className="flex gap-3">
                  {(["comfortable", "compact"] as DensityKey[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setDensity(key);
                        saveDesign(accent, key);
                      }}
                      className={cn(
                        "rounded-lg border px-4 py-2 text-sm transition-colors",
                        density === key ? "border-primary" : "border-border hover:bg-card/60",
                      )}
                    >
                      {key === "comfortable" ? "Просторно" : "Компактно"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SectionShell>
        )}

        {active === "labels" && (
          <SectionShell
            title="Лейблы"
            description="Цветные метки для услуг, бюджета и приоритетов. Используются на сущностях CRM."
          >
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {data.labels.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Лейблов пока нет.</p>
                ) : (
                  data.labels.map((label) => (
                    <span
                      key={label.id}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-[#1B1B1F] py-1 pl-1 pr-2"
                    >
                      <StatusBadge label={label.name} color={label.color} />
                      <button
                        type="button"
                        onClick={() => removeLabel(label.id)}
                        disabled={pending}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
                <div className="space-y-2">
                  <Label htmlFor="label_name">Название лейбла</Label>
                  <Input
                    id="label_name"
                    value={labelName}
                    onChange={(e) => setLabelName(e.target.value)}
                    placeholder="Например: Срочно"
                    className="w-56"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="label_color">Цвет</Label>
                  <input
                    id="label_color"
                    type="color"
                    value={labelColor}
                    onChange={(e) => setLabelColor(e.target.value)}
                    className="h-10 w-16 cursor-pointer rounded-md border border-border bg-card"
                  />
                </div>
                <Button onClick={addLabel} disabled={pending || !labelName.trim()}>
                  Добавить лейбл
                </Button>
              </div>
            </div>
          </SectionShell>
        )}

        {active === "connections" && (
          <SectionShell
            title="Подключения"
            description="Ключи и токены задаются в .env.local и доступны только на сервере. Здесь — только статус."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {data.integrations.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg border border-border bg-[#1B1B1F] px-4 py-3"
                >
                  <span className="text-sm">{item.label}</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-medium",
                      item.configured ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        item.configured ? "bg-primary" : "bg-[#6B7280]",
                      )}
                    />
                    {item.configured ? "Настроено" : "Не задано"}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3 border-t border-border pt-5">
              <div>
                <p className="text-sm font-medium">Сторонние API</p>
                <p className="text-xs text-muted-foreground">
                  Подключай любые внешние сервисы: название, базовый URL и ключ. Хранится в CRM.
                </p>
              </div>

              {connections.length > 0 && (
                <div className="space-y-2">
                  {connections.map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-[#1B1B1F] px-4 py-3"
                    >
                      <span className="font-medium">{c.name}</span>
                      {c.base_url && (
                        <span className="truncate text-xs text-muted-foreground">{c.base_url}</span>
                      )}
                      <span className="font-mono text-xs text-muted-foreground">
                        {c.api_key ? `${c.api_key.slice(0, 4)}••••` : "без ключа"}
                      </span>
                      <button
                        type="button"
                        onClick={() => persistConnections(connections.filter((x) => x.id !== c.id))}
                        className="ml-auto text-muted-foreground hover:text-destructive"
                        aria-label="Удалить"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)_auto]">
                <Input value={connName} onChange={(e) => setConnName(e.target.value)} placeholder="Название (CRM, AmoCRM…)" />
                <Input value={connUrl} onChange={(e) => setConnUrl(e.target.value)} placeholder="https://api.service.com" />
                <Input value={connKey} onChange={(e) => setConnKey(e.target.value)} placeholder="API-ключ" type="password" />
                <Button onClick={addConnection} disabled={pending || !connName.trim()}>
                  Добавить
                </Button>
              </div>
            </div>
          </SectionShell>
        )}

        {active === "api" && (
          <SectionShell
            title="API и вебхуки"
            description="Адреса для регистрации Telegram-вебхуков и статус секрета."
          >
            <div className="space-y-5">
              <div className="space-y-2">
                {webhooks.map((wh) => (
                  <div
                    key={wh.label}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-[#1B1B1F] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{wh.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{wh.url}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => copy(wh.url)}>
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      Копировать
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-[#1B1B1F] px-4 py-3">
                <span className="text-sm">Секрет вебхука (TELEGRAM_WEBHOOK_SECRET)</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-medium",
                    data.webhookSecretSet ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      data.webhookSecretSet ? "bg-primary" : "bg-[#6B7280]",
                    )}
                  />
                  {data.webhookSecretSet ? "Задан" : "Не задан"}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                Зарегистрировать вебхук: <code>https://api.telegram.org/bot&lt;TOKEN&gt;/setWebhook?url=&lt;адрес&gt;</code>.
                Проверка уведомлений: <code>{webhookBase}/api/telegram/internal-bot?test=1</code>.
              </p>

              {/* Свои API */}
              <div className="space-y-3 border-t border-border pt-5">
                <div>
                  <p className="text-sm font-medium">Свои API</p>
                  <p className="text-xs text-muted-foreground">
                    Подключай внешние сервисы (CRM, AmoCRM, рассылки и т.д.): название, базовый URL, ключ. Хранится в CRM.
                  </p>
                </div>

                {connections.length > 0 && (
                  <div className="space-y-2">
                    {connections.map((c) => (
                      <div
                        key={c.id}
                        className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-[#1B1B1F] px-4 py-3"
                      >
                        <span className="font-medium">{c.name}</span>
                        {c.base_url && <span className="truncate text-xs text-muted-foreground">{c.base_url}</span>}
                        <span className="font-mono text-xs text-muted-foreground">
                          {c.api_key ? `${c.api_key.slice(0, 4)}••••` : "без ключа"}
                        </span>
                        <button
                          type="button"
                          onClick={() => persistConnections(connections.filter((x) => x.id !== c.id))}
                          className="ml-auto text-muted-foreground hover:text-destructive"
                          aria-label="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)_auto]">
                  <Input value={connName} onChange={(e) => setConnName(e.target.value)} placeholder="Название" />
                  <Input value={connUrl} onChange={(e) => setConnUrl(e.target.value)} placeholder="https://api.service.com" />
                  <Input value={connKey} onChange={(e) => setConnKey(e.target.value)} placeholder="API-ключ" type="password" />
                  <Button onClick={addConnection} disabled={pending || !connName.trim()}>
                    Добавить
                  </Button>
                </div>
              </div>
            </div>
          </SectionShell>
        )}

        {active === "journal" && (
          <SectionShell
            title="Журнал"
            description="Ошибки CRM и история обновлений."
          >
            <div className="mb-5 inline-flex rounded-lg border border-border bg-card p-1">
              <button
                type="button"
                onClick={() => setJournalTab("errors")}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  journalTab === "errors" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Ошибки
              </button>
              <button
                type="button"
                onClick={() => setJournalTab("updates")}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  journalTab === "updates" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Обновления
              </button>
            </div>

            {journalTab === "errors" ? (
              <div className="space-y-2">
                {data.errors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Ошибок нет. Если CRM где-то упадёт — ошибка появится здесь с кнопкой «Скопировать».
                  </p>
                ) : (
                  data.errors.map((err) => (
                    <div
                      key={err.id}
                      className={cn(
                        "rounded-lg border p-3",
                        err.status === "fixed" ? "border-border bg-[#1B1B1F]" : "border-destructive/40 bg-destructive/5",
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-medium">
                            {err.status === "fixed" ? (
                              <Check className="h-4 w-4 text-primary" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                            )}
                            <span className="truncate">{err.title}</span>
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {err.route ? `${err.route} · ` : ""}{fmtDateTime(err.created_at)}
                            {err.status === "fixed" && err.fixed_at ? ` · исправлено ${fmtDateTime(err.fixed_at)}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copy(`${err.title}\n\n${err.detail ?? ""}`)}
                          >
                            <Copy className="mr-1 h-3.5 w-3.5" />
                            Скопировать
                          </Button>
                          {err.status === "fixed" ? (
                            <span className="inline-flex items-center gap-1 text-xs text-primary">
                              <Check className="h-3.5 w-3.5" /> Исправлено
                            </span>
                          ) : (
                            <Button size="sm" disabled={pending} onClick={() => checkError(err.id)}>
                              Проверить
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={() => setClOpen(true)}>Добавить</Button>
                </div>

                <Dialog open={clOpen} onOpenChange={setClOpen}>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Новая запись в журнал</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="cl_number">Номер (необязательно)</Label>
                        <Input id="cl_number" value={clNumber} onChange={(e) => setClNumber(e.target.value)} placeholder="напр. v1.4" className="w-40" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cl_desc">Что изменили / добавили / удалили</Label>
                        <Textarea id="cl_desc" rows={3} value={clDesc} onChange={(e) => setClDesc(e.target.value)} placeholder="Добавлены уведомления и журнал ошибок" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={addChangelogEntry} disabled={pending || !clDesc.trim()}>
                        Сохранить
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {changelog.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Записей об обновлениях пока нет.</p>
                ) : (
                  <div className="space-y-2">
                    {changelog.map((entry) => (
                      <div key={entry.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            <span className="text-primary">{entry.number}</span> · {fmtDateTime(entry.created_at)}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{entry.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => persistChangelog(changelog.filter((c) => c.id !== entry.id))}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          aria-label="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </SectionShell>
        )}

        {active === "advanced" && (
          <SectionShell
            title="Расширенные настройки"
            description="Системная информация и параметры для опытных пользователей."
          >
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-[#1B1B1F] px-4 py-3">
                  <p className="text-xs text-muted-foreground">Окружение</p>
                  <p className="text-sm font-medium">{process.env.NODE_ENV ?? "—"}</p>
                </div>
                <div className="rounded-lg border border-border bg-[#1B1B1F] px-4 py-3">
                  <p className="text-xs text-muted-foreground">Адрес приложения</p>
                  <p className="truncate text-sm font-medium">{webhookBase}</p>
                </div>
              </div>

              {/* Резервное копирование */}
              <div className="rounded-lg border border-border bg-[#1B1B1F] px-4 py-3">
                <p className="text-sm font-medium">Резервное копирование данных</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Скачать копию всех данных (лиды, клиенты, проекты, оплаты, задачи и т.д.) в JSON.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <a href="/api/backup/export" download>
                      Скачать резервную копию
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/backup/export");
                        const text = await res.text();
                        await navigator.clipboard.writeText(text);
                        toast.success("Копия скопирована в буфер");
                      } catch {
                        toast.error("Не удалось скопировать");
                      }
                    }}
                  >
                    Скопировать в буфер
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-[#1B1B1F] px-4 py-3">
                <p className="text-sm font-medium">Политика данных</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  <li>Лиды не удаляются из системы (бизнес-правило).</li>
                  <li>service_role-ключ используется только на сервере.</li>
                  <li>RLS в MVP — упрощённый, в V2 будет role-based.</li>
                </ul>
              </div>

              <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
                <p className="text-sm font-medium text-destructive">Опасная зона</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Массовые операции (экспорт, очистка демо-данных) появятся в следующих версиях.
                  Действия с продакшн-базой выполняются вручную и с подтверждением.
                </p>
              </div>
            </div>
          </SectionShell>
        )}
      </div>
    </div>
  );
}
