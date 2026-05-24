"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Result = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  group: string;
};

export function GlobalSearch() {
  const router = useRouter();
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Закрытие по клику вне
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Дебаунс-поиск
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      const pattern = `%${q}%`;
      const [leadsRes, clientsRes, projectsRes] = await Promise.all([
        supabase.from("leads").select("id, name, status").ilike("name", pattern).limit(5),
        supabase.from("clients").select("id, name, company_name").ilike("name", pattern).limit(5),
        supabase.from("projects").select("id, title").ilike("title", pattern).limit(5),
      ]);

      const next: Result[] = [
        ...(leadsRes.data ?? []).map((l) => ({
          id: l.id as string,
          title: l.name as string,
          subtitle: "Лид",
          href: `/leads/${l.id}`,
          group: "Лиды",
        })),
        ...(clientsRes.data ?? []).map((c) => ({
          id: c.id as string,
          title: c.name as string,
          subtitle: (c.company_name as string) || "Клиент",
          href: `/clients/${c.id}`,
          group: "Клиенты",
        })),
        ...(projectsRes.data ?? []).map((p) => ({
          id: p.id as string,
          title: p.title as string,
          subtitle: "Проект",
          href: `/projects/${p.id}`,
          group: "Проекты",
        })),
      ];

      setResults(next);
      setLoading(false);
      setOpen(true);
    }, 250);

    return () => clearTimeout(timer);
  }, [query, supabase]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(href);
  }

  const grouped = results.reduce<Record<string, Result[]>>((acc, r) => {
    (acc[r.group] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Поиск по лидам, клиентам, проектам…"
        className={cn(
          "h-10 w-full rounded-md border border-border bg-card pl-9 pr-9 text-sm outline-none",
          "placeholder:text-muted-foreground focus:border-primary/60",
        )}
      />
      {loading ? (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : query ? (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setResults([]);
            setOpen(false);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}

      {open && (
        <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              {query.trim().length < 2 ? "Введите минимум 2 символа" : "Ничего не найдено"}
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto py-2">
              {Object.entries(grouped).map(([group, items]) => (
                <div key={group}>
                  <p className="px-4 py-1.5 text-xs font-medium text-muted-foreground">{group}</p>
                  {items.map((r) => (
                    <button
                      key={r.href}
                      type="button"
                      onClick={() => go(r.href)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left transition-colors hover:bg-card"
                    >
                      <span className="truncate text-sm font-medium">{r.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{r.subtitle}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
