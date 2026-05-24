export const PROJECT_META_PREFIX = "__STUDIO_CRM_PROJECT_META__";

export interface ProjectMetaContact {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  phone: string;
  email: string;
  telegram: string;
  whatsapp: string;
  notes: string;
}

export interface ProjectMetaLink {
  id: string;
  label: string;
  url: string;
}

export interface ProjectMetaAsset {
  id: string;
  name: string;
  url: string;
  type?: string;
  size?: number;
}

export interface ProjectMeta {
  notes: string;
  details: string;
  contacts: ProjectMetaContact[];
  links: ProjectMetaLink[];
  assets: ProjectMetaAsset[];
}

export function emptyProjectMeta(): ProjectMeta {
  return {
    notes: "",
    details: "",
    contacts: [],
    links: [],
    assets: [],
  };
}

function normalizeContact(value: Partial<ProjectMetaContact>): ProjectMetaContact {
  return {
    id: String(value.id ?? ""),
    firstName: String(value.firstName ?? ""),
    lastName: String(value.lastName ?? ""),
    role: String(value.role ?? ""),
    phone: String(value.phone ?? ""),
    email: String(value.email ?? ""),
    telegram: String(value.telegram ?? ""),
    whatsapp: String(value.whatsapp ?? ""),
    notes: String(value.notes ?? ""),
  };
}

function normalizeLink(value: Partial<ProjectMetaLink>): ProjectMetaLink {
  return {
    id: String(value.id ?? ""),
    label: String(value.label ?? ""),
    url: String(value.url ?? ""),
  };
}

function normalizeAsset(value: Partial<ProjectMetaAsset>): ProjectMetaAsset {
  return {
    id: String(value.id ?? ""),
    name: String(value.name ?? ""),
    url: String(value.url ?? ""),
    type: value.type ? String(value.type) : undefined,
    size:
      value.size == null || Number.isNaN(Number(value.size))
        ? undefined
        : Number(value.size),
  };
}

export function parseProjectMeta(raw: string | null | undefined): ProjectMeta {
  if (!raw) return emptyProjectMeta();

  if (!raw.startsWith(PROJECT_META_PREFIX)) {
    return {
      ...emptyProjectMeta(),
      notes: raw,
    };
  }

  try {
    const json = raw.slice(PROJECT_META_PREFIX.length).trim();
    const parsed = JSON.parse(json) as Partial<ProjectMeta>;

    return {
      notes: String(parsed.notes ?? ""),
      details: String(parsed.details ?? ""),
      contacts: Array.isArray(parsed.contacts)
        ? parsed.contacts.map((item) => normalizeContact(item))
        : [],
      links: Array.isArray(parsed.links)
        ? parsed.links.map((item) => normalizeLink(item))
        : [],
      assets: Array.isArray(parsed.assets)
        ? parsed.assets.map((item) => normalizeAsset(item))
        : [],
    };
  } catch {
    return {
      ...emptyProjectMeta(),
      notes: raw,
    };
  }
}

export function serializeProjectMeta(meta: ProjectMeta): string | null {
  const clean: ProjectMeta = {
    notes: meta.notes.trim(),
    details: meta.details.trim(),
    contacts: meta.contacts
      .map((contact) => normalizeContact(contact))
      .filter((contact) =>
        [
          contact.firstName,
          contact.lastName,
          contact.role,
          contact.phone,
          contact.email,
          contact.telegram,
          contact.whatsapp,
          contact.notes,
        ].some(Boolean),
      ),
    links: meta.links
      .map((link) => normalizeLink(link))
      .filter((link) => link.url.trim()),
    assets: meta.assets
      .map((asset) => normalizeAsset(asset))
      .filter((asset) => asset.url.trim()),
  };

  const hasStructuredData =
    Boolean(clean.details) ||
    clean.contacts.length > 0 ||
    clean.links.length > 0 ||
    clean.assets.length > 0;

  if (!hasStructuredData) {
    return clean.notes || null;
  }

  return `${PROJECT_META_PREFIX}\n${JSON.stringify(clean)}`;
}
