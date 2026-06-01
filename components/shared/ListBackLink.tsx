"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buildListHref, type CrmListQuery } from "@/lib/crm-list-query";
import { Button } from "@/components/ui/button";

export function ListBackLink({
  href,
  listQuery,
}: {
  href: string;
  listQuery?: CrmListQuery;
}) {
  const backHref = listQuery ? buildListHref(href, listQuery) : href;

  return (
    <Button variant="ghost" size="icon" asChild>
      <Link href={backHref}>
        <ArrowLeft className="h-4 w-4" />
      </Link>
    </Button>
  );
}
