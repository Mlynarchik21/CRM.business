"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateLeadColdSearch } from "@/app/(dashboard)/leads/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ColdSearch } from "@/types";

const FIELDS: { key: keyof ColdSearch; label: string; placeholder: string; area?: boolean }[] = [
  { key: "found_at", label: "Где найден", placeholder: "Площадка / ссылка, где нашли" },
  { key: "business_type", label: "Тип бизнеса", placeholder: "Ниша, чем занимается" },
  { key: "links", label: "Сайт / соцсети / карты", placeholder: "Ссылки через запятую" },
  { key: "business_age", label: "Срок работы бизнеса", placeholder: "Например: 3 года" },
  { key: "assets", label: "Что уже есть", placeholder: "Сайт, бот, реклама…", area: true },
  { key: "offer", label: "Что можем предложить", placeholder: "Идея/оффер под этого клиента", area: true },
];

export function ColdSearchPanel({
  leadId,
  initial,
}: {
  leadId: string;
  initial: ColdSearch | null | undefined;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const f of FIELDS) base[f.key] = (initial?.[f.key] as string) ?? "";
    return base;
  });

  function field(key: string, value: string) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      const result = await updateLeadColdSearch(leadId, data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Данные холодного поиска сохранены");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Холодный поиск</CardTitle>
        <CardDescription>
          Расширенные данные по лиду для холодного поиска и агента поиска.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {FIELDS.filter((f) => !f.area).map((f) => (
            <div key={f.key} className="space-y-2">
              <Label>{f.label}</Label>
              <Input
                value={data[f.key]}
                onChange={(e) => field(f.key, e.target.value)}
                placeholder={f.placeholder}
              />
            </div>
          ))}
        </div>
        {FIELDS.filter((f) => f.area).map((f) => (
          <div key={f.key} className="space-y-2">
            <Label>{f.label}</Label>
            <Textarea
              value={data[f.key]}
              onChange={(e) => field(f.key, e.target.value)}
              placeholder={f.placeholder}
              rows={2}
            />
          </div>
        ))}
        <div className="flex justify-end">
          <Button onClick={save} disabled={pending}>
            {pending ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
