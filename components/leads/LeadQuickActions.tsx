"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { PhoneCall, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { createClientFromLead } from "@/app/(dashboard)/clients/actions";
import { setLeadStatus } from "@/app/(dashboard)/leads/actions";
import { Button } from "@/components/ui/button";

export function LeadQuickActions({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(action: "client" | "auto_call" | "not_potential") {
    startTransition(async () => {
      if (action === "client") {
        const result = await createClientFromLead(leadId);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }

        toast.success("Лид переведён в клиенты");
        router.push(`/clients/${result.id}`);
        router.refresh();
        return;
      }

      const status = action === "auto_call" ? "no_answer" : "not_bought";
      const result = await setLeadStatus(leadId, status);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(
        action === "auto_call"
          ? "Лид помечен как «Не дозвонился»"
          : "Лид помечен как «Не потенциальный»",
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={() => run("client")} disabled={pending}>
        <UserCheck className="mr-2 h-4 w-4" />
        В клиента
      </Button>
      <Button variant="secondary" onClick={() => run("auto_call")} disabled={pending}>
        <PhoneCall className="mr-2 h-4 w-4" />
        Не дозвонился
      </Button>
      <Button variant="outline" onClick={() => run("not_potential")} disabled={pending}>
        <UserX className="mr-2 h-4 w-4" />
        Не потенциальный
      </Button>
    </div>
  );
}
