import { SettingsClient, type SettingsData } from "@/components/settings/SettingsClient";
import {
  ACCENT_PRESETS,
  DEFAULT_ACCENT,
  type AccentKey,
  type DensityKey,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Label as LabelRow, Profile, Setting } from "@/types";

function settingString(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  if (value == null) return fallback;
  return String(value);
}

const INTEGRATIONS = [
  { env: "NEXT_PUBLIC_SUPABASE_URL", label: "Supabase URL" },
  { env: "NEXT_PUBLIC_SUPABASE_ANON_KEY", label: "Supabase anon key" },
  { env: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase service role" },
  { env: "TELEGRAM_LEAD_BOT_TOKEN", label: "Telegram Lead Bot" },
  { env: "TELEGRAM_SUPPORT_BOT_TOKEN", label: "Telegram Support Bot" },
  { env: "TELEGRAM_INTERNAL_BOT_TOKEN", label: "Telegram Internal Bot" },
  { env: "TELEGRAM_INTERNAL_CHAT_ID", label: "Telegram чат команды" },
];

export default async function SettingsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileRes, settingsRes, labelsRes, errorsRes] = await Promise.all([
    user
      ? supabase
          .from("profiles")
          .select("full_name, telegram_username")
          .eq("auth_user_id", user.id)
          .maybeSingle<Pick<Profile, "full_name" | "telegram_username">>()
      : Promise.resolve({ data: null }),
    supabase.from("settings").select("key, value").returns<Pick<Setting, "key" | "value">[]>(),
    supabase.from("labels").select("*").order("created_at", { ascending: true }).returns<LabelRow[]>(),
    supabase
      .from("error_logs")
      .select("id, title, detail, route, status, created_at, fixed_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const settingsMap = new Map(
    (settingsRes.data ?? []).map((s) => [s.key, s.value] as const),
  );

  const accentValue = settingString(settingsMap.get("ui_accent"), DEFAULT_ACCENT);
  const accent: AccentKey = (accentValue in ACCENT_PRESETS ? accentValue : DEFAULT_ACCENT) as AccentKey;
  const density: DensityKey =
    settingString(settingsMap.get("ui_density"), "comfortable") === "compact"
      ? "compact"
      : "comfortable";

  const data: SettingsData = {
    profile: {
      full_name: profileRes.data?.full_name ?? user?.email ?? "",
      telegram_username: profileRes.data?.telegram_username ?? "",
    },
    company: {
      company_name: settingString(settingsMap.get("company_name"), "Studio CRM"),
      default_currency: settingString(settingsMap.get("default_currency"), "USD"),
    },
    labels: labelsRes.data ?? [],
    appearance: { accent, density },
    integrations: INTEGRATIONS.map((item) => ({
      label: item.label,
      configured: Boolean(process.env[item.env]),
    })),
    connections: Array.isArray(settingsMap.get("connections"))
      ? (settingsMap.get("connections") as SettingsData["connections"])
      : [],
    errors: (errorsRes.data ?? []) as SettingsData["errors"],
    changelog: Array.isArray(settingsMap.get("changelog"))
      ? (settingsMap.get("changelog") as SettingsData["changelog"])
      : [],
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
    webhookSecretSet: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Настройки</h1>
        <p className="text-muted-foreground">
          Профиль, компания, дизайн, лейблы, подключения и API — каждый раздел отдельно.
        </p>
      </div>

      <SettingsClient data={data} />
    </div>
  );
}
