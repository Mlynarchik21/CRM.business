import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ACCENT_PRESETS, DEFAULT_ACCENT, type AccentKey } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/types";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // На случай прямого захода без сессии (middleware обычно уже редиректит)
  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: accentSetting }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("auth_user_id", user.id)
      .maybeSingle<Profile>(),
    supabase
      .from("settings")
      .select("value")
      .eq("key", "ui_accent")
      .maybeSingle<{ value: unknown }>(),
  ]);

  const name = profile?.full_name ?? user.email ?? "Пользователь";
  const role: Role = profile?.role ?? "manager";
  const email = user.email ?? "";

  // Акцентный цвет из настроек применяется ко всему CRM через CSS-переменные.
  const accentRaw = typeof accentSetting?.value === "string" ? accentSetting.value : DEFAULT_ACCENT;
  const accent: AccentKey = (accentRaw in ACCENT_PRESETS ? accentRaw : DEFAULT_ACCENT) as AccentKey;
  const accentHsl = ACCENT_PRESETS[accent].hsl;

  return (
    <div className="flex h-screen overflow-hidden">
      <style>{`:root{--primary:${accentHsl};--ring:${accentHsl};}`}</style>
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar name={name} role={role} email={email} />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
