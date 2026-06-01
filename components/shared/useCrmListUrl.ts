"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  buildListHref,
  mergeListQuery,
  parseListQuery,
  type CrmListQuery,
} from "@/lib/crm-list-query";

export function useCrmListUrl(basePath: string) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const query = useMemo(
    () => parseListQuery(searchParams),
    [searchParams],
  );

  const replaceQuery = useCallback(
    (patch: Partial<CrmListQuery>) => {
      const next = mergeListQuery(query, patch);
      router.replace(buildListHref(basePath, next), { scroll: false });
    },
    [basePath, query, router],
  );

  const detailHref = useCallback(
    (id: string) => {
      const fromQs = searchParams.toString();
      return fromQs ? `${basePath}/${id}?from=${encodeURIComponent(fromQs)}` : `${basePath}/${id}`;
    },
    [basePath, searchParams],
  );

  return { query, replaceQuery, detailHref };
}
