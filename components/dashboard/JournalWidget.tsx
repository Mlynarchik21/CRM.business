import Link from "next/link";
import { AlertTriangle, Check, History } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type UpdateItem = { number: string; description: string; created_at: string };
type ErrorItem = { id: string; title: string; status: string; created_at: string };

function shortDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d
    .toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(",", "");
}

export function JournalWidget({
  updates,
  errors,
}: {
  updates: UpdateItem[];
  errors: ErrorItem[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Последние обновления */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-primary" />
            Последние обновления
          </CardTitle>
          <Link href="/settings" className="text-xs text-primary hover:underline">
            Журнал
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {updates.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Записей пока нет</p>
          ) : (
            updates.map((u, i) => (
              <div key={`${u.number}-${i}`} className="rounded-lg bg-[#1B1B1F] p-3">
                <p className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-primary">{u.number}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {shortDateTime(u.created_at)}
                  </span>
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{u.description}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Последние ошибки */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Последние ошибки
          </CardTitle>
          <Link href="/settings" className="text-xs text-primary hover:underline">
            Журнал
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {errors.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Ошибок нет</p>
          ) : (
            errors.map((e) => {
              const fixed = e.status === "fixed";
              return (
                <div key={e.id} className="flex items-center justify-between gap-3 rounded-lg bg-[#1B1B1F] p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{shortDateTime(e.created_at)}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      fixed ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {fixed ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                    {fixed ? "Исправлено" : "Открыта"}
                  </span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
