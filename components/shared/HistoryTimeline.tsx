import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { HistoryEntry } from "@/lib/history";

function timeText(value: string) {
  const d = new Date(value);
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return `${formatDate(value, true)}, ${time}`;
}

export function HistoryTimeline({ entries }: { entries: HistoryEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>История</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Событий пока нет.</p>
        ) : (
          <ol className="relative space-y-4 border-l border-border pl-5">
            {entries.map((entry) => (
              <li key={entry.id} className="relative">
                <span className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{entry.label}</p>
                  <span className="text-xs text-muted-foreground">{timeText(entry.created_at)}</span>
                </div>
                {entry.detail && (
                  <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">
                    {entry.detail}
                  </p>
                )}
                {entry.author && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{entry.author}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
