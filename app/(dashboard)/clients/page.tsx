import { Suspense } from "react";
import { ClientsTable, type ClientTableItem } from "@/components/clients/ClientsTable";
import { getCrmDisplayIdMaps } from "@/lib/crm-display-id";
import { createClient } from "@/lib/supabase/server";
import type { Client } from "@/types";

export default async function ClientsPage() {
  const supabase = createClient();
  const { clientIdMap } = await getCrmDisplayIdMaps(supabase);
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Client[]>();

  const items: ClientTableItem[] = (clients ?? []).map((client) => ({
    ...client,
    crmId: clientIdMap[client.id] ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Клиенты</h1>
        <p className="text-muted-foreground">
          Активная клиентская база, платежи и история работы с проектами.
        </p>
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground">Загрузка списка…</p>}>
        <ClientsTable clients={items} />
      </Suspense>
    </div>
  );
}
