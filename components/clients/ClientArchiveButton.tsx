"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { setClientArchived } from "@/app/(dashboard)/clients/actions";
import { Button } from "@/components/ui/button";

export function ClientArchiveButton({
  clientId,
  archived,
}: {
  clientId: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await setClientArchived(clientId, !archived);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(archived ? "Клиент возвращён из архива" : "Клиент перемещён в архив");
      router.refresh();
    });
  }

  return (
    <Button variant="outline" onClick={toggle} disabled={pending}>
      {archived ? (
        <>
          <ArchiveRestore className="mr-2 h-4 w-4" />
          Из архива
        </>
      ) : (
        <>
          <Archive className="mr-2 h-4 w-4" />
          В архив
        </>
      )}
    </Button>
  );
}
