import { NotificationsClient } from "@/components/notifications/NotificationsClient";
import { getNotifications } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

export default async function NotificationsPage() {
  const supabase = createClient();
  const items = await getNotifications(supabase);
  return <NotificationsClient items={items} />;
}
