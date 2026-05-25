"use client";

import { useEffect, useState } from "react";
import { Copy, RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Перехватчик ошибок раздела. Показывает понятную плашку вместо «белого экрана»
 * и пишет ошибку в журнал (Настройки → Журнал → Ошибки).
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Логируем ошибку в CRM (best-effort).
    const route = typeof window !== "undefined" ? window.location.pathname : "";
    fetch("/api/errors/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: error.message || "Ошибка интерфейса",
        detail: `${error.stack ?? ""}${error.digest ? `\n\ndigest: ${error.digest}` : ""}`,
        route,
      }),
    }).catch(() => {});
  }, [error]);

  function copy() {
    const text = `${error.message}\n\n${error.stack ?? ""}${error.digest ? `\ndigest: ${error.digest}` : ""}`;
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border border-destructive/40 bg-destructive/5 p-6">
        <div className="mb-3 flex items-center gap-2 text-destructive">
          <TriangleAlert className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Что-то пошло не так</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Произошла ошибка в этом разделе. Она записана в журнал
          (Настройки → Журнал → Ошибки). Можно скопировать текст и прислать разработчику.
        </p>
        <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-[#1B1B1F] p-3 text-xs text-muted-foreground">
          {error.message}
        </pre>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={reset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Попробовать снова
          </Button>
          <Button variant="outline" onClick={copy}>
            <Copy className="mr-2 h-4 w-4" />
            {copied ? "Скопировано" : "Скопировать ошибку"}
          </Button>
        </div>
      </div>
    </div>
  );
}
