/** Состояние списка (пагинация, фильтры) в URL — сохраняется при переходе в карточку и назад. */

export type CrmListQuery = {
  page?: number;
  q?: string;
  status?: string;
  size?: number;
  view?: string;
  expanded?: string;
};

function first(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function parseListQuery(
  searchParams: Record<string, string | string[] | undefined> | URLSearchParams,
): CrmListQuery {
  const get = (key: string) =>
    searchParams instanceof URLSearchParams
      ? searchParams.get(key) ?? undefined
      : first(searchParams[key]);

  const page = parsePositiveInt(get("page"), 1);
  const size = parsePositiveInt(get("size"), 25);
  const q = get("q")?.trim() || undefined;
  const status = get("status") || undefined;
  const view = get("view") || undefined;
  const expanded = get("expanded") || undefined;

  return {
    page: page > 1 ? page : undefined,
    q,
    status: status && status !== "all" ? status : undefined,
    size: size !== 25 ? size : undefined,
    view: view && view !== "active" ? view : undefined,
    expanded,
  };
}

export function buildListHref(basePath: string, query: CrmListQuery): string {
  const params = new URLSearchParams();
  if (query.page && query.page > 1) params.set("page", String(query.page));
  if (query.q) params.set("q", query.q);
  if (query.status) params.set("status", query.status);
  if (query.size && query.size !== 25) params.set("size", String(query.size));
  if (query.view) params.set("view", query.view);
  if (query.expanded) params.set("expanded", query.expanded);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function parseListQueryFromParam(from: string | undefined): CrmListQuery {
  if (!from?.trim()) return {};
  return parseListQuery(new URLSearchParams(from));
}

export function mergeListQuery(
  current: CrmListQuery,
  patch: Partial<CrmListQuery>,
): CrmListQuery {
  const next = { ...current, ...patch };
  if (patch.page === 1) delete next.page;
  if (patch.q === "") delete next.q;
  if (patch.status === "all") delete next.status;
  if (patch.size === 25) delete next.size;
  if (patch.view === "active") delete next.view;
  if (patch.expanded === undefined || patch.expanded === "") delete next.expanded;
  return next;
}
