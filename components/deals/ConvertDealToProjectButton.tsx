"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderKanban } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ConvertDealToProjectButton({
  dealId,
  convert,
}: {
  dealId: string;
  convert: (dealId: string) => Promise<{ ok: boolean; id?: string; error?: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await convert(dealId);
      if (!result.ok || !result.id) {
        toast.error(result.error ?? "Не удалось создать проект");
        return;
      }

      toast.success("Проект создан из сделки");
      router.push(`/projects/${result.id}`);
      router.refresh();
    });
  }

  return (
    <Button onClick={onClick} disabled={isPending}>
      <FolderKanban className="mr-2 h-4 w-4" />
      {isPending ? "Создание..." : "В проект"}
    </Button>
  );
}
