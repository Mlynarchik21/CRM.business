"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buildListHref, type CrmListQuery } from "@/lib/crm-list-query";
import { Button } from "@/components/ui/button";

function hasData(q: CrmListQuery | undefined): q is CrmListQuery {
  return !!q && Object.values(q).some((v) => v !== undefined);
}

export function ListBackLink({
  href,
  listQuery,
}: {
  href: string;
  listQuery?: CrmListQuery;
}) {
  const router = useRouter();

  if (!hasData(listQuery)) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.back()}
        aria-label="Назад"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button variant="ghost" size="icon" asChild>
      <Link href={buildListHref(href, listQuery)}>
        <ArrowLeft className="h-4 w-4" />
      </Link>
    </Button>
  );
}
