import { Loader2 } from "lucide-react";

/**
 * Экран загрузки раздела. Next.js показывает его, пока серверный компонент
 * страницы тянет данные — чтобы было видно, что CRM грузится, а не зависла.
 */
export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Загрузка…</p>
    </div>
  );
}
