/** Извлекает Instagram / GitHub из строки ссылок (cold_search.links и т.п.). */
export function parseSocialFromLinks(links: string | null | undefined): {
  instagram: string | null;
  github: string | null;
} {
  if (!links?.trim()) {
    return { instagram: null, github: null };
  }

  const tokens = links
    .split(/[\s,;|]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  let instagram: string | null = null;
  let github: string | null = null;

  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (!instagram && (lower.includes("instagram.com") || lower.includes("instagr.am"))) {
      instagram = token;
    }
    if (!github && lower.includes("github.com")) {
      github = token;
    }
  }

  return { instagram, github };
}

export function leadBusinessName(lead: {
  name: string;
  cold_search?: { business_type?: string } | null;
}): string {
  const niche = lead.cold_search?.business_type?.trim();
  if (niche && niche !== lead.name.trim()) {
    return `${lead.name} · ${niche}`;
  }
  return lead.name;
}
