import { NotificationsClient, type NotificationRow } from "@/components/notifications/NotificationsClient";
import { getNotifications } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

export default async function NotificationsPage() {
  const supabase = createClient();

  const [items, readRes, dismissedRes] = await Promise.all([
    getNotifications(supabase),
    supabase.from("settings").select("value").eq("key", "notif_read").maybeSingle<{ value: unknown }>(),
    supabase.from("settings").select("value").eq("key", "notif_dismissed").maybeSingle<{ value: unknown }>(),
  ]);

  const readSet = new Set(Array.isArray(readRes.data?.value) ? (readRes.data!.value as string[]) : []);
  const dismissedSet = new Set(
    Array.isArray(dismissedRes.data?.value) ? (dismissedRes.data!.value as string[]) : [],
  );

  const rows: NotificationRow[] = items
    .filter((n) => !dismissedSet.has(n.id))
    .map((n) => ({ ...n, read: readSet.has(n.id) }));

  return <NotificationsClient items={rows} />;
}
