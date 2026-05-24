"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClientFromLead } from "@/app/(dashboard)/clients/actions";

export function CreateClientFromLeadButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await createClientFromLead(leadId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Клиент создан");
      router.push(`/clients/${result.id}`);
      router.refresh();
    });
  }

  return (
    <Button variant="secondary" onClick={onClick} disabled={pending}>
      <UserPlus className="mr-2 h-4 w-4" />
      {pending ? "Создание..." : "В клиента"}
    </Button>
  );
}
