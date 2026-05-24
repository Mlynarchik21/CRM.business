"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ClientNotesEditor({
  initialValue,
  save,
}: {
  initialValue: string;
  save: (value: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    setSaving(true);
    const result = await save(value);
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error ?? "Не удалось сохранить заметки");
      return;
    }

    toast.success("Заметки сохранены");
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={10}
        placeholder="Здесь можно хранить договорённости, правки, контекст, комментарии по клиенту и внутренние заметки."
      />
      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Сохранение..." : "Сохранить заметки"}
        </Button>
      </div>
    </div>
  );
}
