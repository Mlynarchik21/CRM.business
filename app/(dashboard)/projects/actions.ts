"use server";

import { revalidatePath } from "next/cache";
import {
  parseProjectMeta,
  serializeProjectMeta,
  type ProjectMeta,
} from "@/lib/project-content";
import { createClient } from "@/lib/supabase/server";
import {
  PROJECT_STATUSES,
  projectSchema,
  type ProjectFormValues,
} from "@/lib/validations";
import type { ProjectStage } from "@/types";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

function normalize<T extends Record<string, unknown>>(obj: T) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value === "") {
      out[key] = null;
      continue;
    }
    out[key] = value;
  }
  return out;
}

async function currentProfileId(
  supabase: ReturnType<typeof createClient>,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle<{ id: string }>();

  return data?.id ?? null;
}

export async function createProjectRecord(
  input: ProjectFormValues,
): Promise<ActionResult> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ошибка валидации",
    };
  }

  const supabase = createClient();
  const managerId = await currentProfileId(supabase);

  const payload = normalize(parsed.data);
  payload.tech_spec = serializeProjectMeta({
    ...parseProjectMeta(undefined),
    notes: String(parsed.data.tech_spec ?? ""),
  });
  const { data, error } = await supabase
    .from("projects")
    .insert({ ...payload, manager_id: managerId })
    .select("id, client_id")
    .single();

  if (error) return { ok: false, error: error.message };

  // Инкрементируем projects_count клиента.
  if (data.client_id) {
    supabase
      .rpc("increment_client_projects_count", { client_uuid: data.client_id })
      .then(() => {})
      .catch(() => {
        // Если функции нет (fallback для MVP), пересчитаем вручную.
        supabase
          .from("projects")
          .select("id")
          .eq("client_id", data.client_id)
          .then(({ data: projects }) => {
            supabase
              .from("clients")
              .update({ projects_count: (projects ?? []).length })
              .eq("id", data.client_id)
              .then(() => {})
              .catch(() => {}); // Ошибка не должна сломать основное действие
          })
          .catch(() => {}); // Ошибка чтения не должна сломать основное действие
      });
  }

  revalidatePath("/projects");
  revalidatePath("/");
  if (data.client_id) revalidatePath(`/clients/${data.client_id}`);
  return { ok: true, id: data.id };
}

export async function updateProjectRecord(
  id: string,
  input: ProjectFormValues,
): Promise<ActionResult> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ошибка валидации",
    };
  }

  const supabase = createClient();
  const { data: existingProject } = await supabase
    .from("projects")
    .select("tech_spec, client_id")
    .eq("id", id)
    .maybeSingle<{ tech_spec: string | null; client_id: string | null }>();

  const meta = parseProjectMeta(existingProject?.tech_spec);
  const payload = normalize(parsed.data);
  payload.tech_spec = serializeProjectMeta({
    ...meta,
    notes: String(parsed.data.tech_spec ?? ""),
  });

  const { error } = await supabase
    .from("projects")
    .update(payload)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);  revalidatePath("/analytics");
  if (existingProject?.client_id) revalidatePath(`/clients/${existingProject.client_id}`);  return { ok: true, id };
}

export async function updateProjectWorkspace(
  projectId: string,
  input: {
    description: string;
    notes: string;
    details: string;
    contacts: ProjectMeta["contacts"];
    links: ProjectMeta["links"];
    assets: ProjectMeta["assets"];
  },
): Promise<ActionResult> {
  const supabase = createClient();
  const tech_spec = serializeProjectMeta({
    notes: String(input.notes ?? ""),
    details: String(input.details ?? ""),
    contacts: Array.isArray(input.contacts) ? input.contacts : [],
    links: Array.isArray(input.links) ? input.links : [],
    assets: Array.isArray(input.assets) ? input.assets : [],
  });

  const { error } = await supabase
    .from("projects")
    .update({
      description: String(input.description ?? "").trim() || null,
      tech_spec,
    })
    .eq("id", projectId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/");
  return { ok: true, id: projectId };
}

/**
 * Сохраняет этапы проекта и пересчитывает прогресс (доля выполненных этапов).
 * Если миграция 003 ещё не применена (нет колонки stages) — вернёт понятную ошибку.
 */
export async function updateProjectStages(
  projectId: string,
  stages: ProjectStage[],
): Promise<ActionResult & { progress?: number }> {
  const supabase = createClient();

  // Нормализуем и пересчитываем прогресс.
  const clean = stages.map((stage) => ({
    id: String(stage.id),
    title: String(stage.title ?? "").slice(0, 200),
    description: String(stage.description ?? ""),
    done: Boolean(stage.done),
    attachments: Array.isArray(stage.attachments)
      ? stage.attachments.map((attachment) => ({
          id: String(attachment.id),
          name: String(attachment.name ?? "").slice(0, 200),
          url: String(attachment.url ?? ""),
          size:
            attachment.size == null || Number.isNaN(Number(attachment.size))
              ? undefined
              : Number(attachment.size),
          type: attachment.type ? String(attachment.type).slice(0, 120) : undefined,
        }))
      : [],
    links: Array.isArray(stage.links)
      ? stage.links
          .map((link) => ({
            id: String(link.id),
            label: String(link.label ?? "").slice(0, 120),
            url: String(link.url ?? ""),
          }))
          .filter((link) => link.url)
      : [],
  }));

  const total = clean.length;
  const doneCount = clean.filter((s) => s.done).length;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const { error } = await supabase
    .from("projects")
    .update({ stages: clean, progress })
    .eq("id", projectId);

  if (error) {
    if (/stages/.test(error.message) && /column/i.test(error.message)) {
      return {
        ok: false,
        error:
          "Нужно применить миграцию 003 (поле stages у проектов) в Supabase SQL Editor.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/");
  return { ok: true, id: projectId, progress };
}

export async function updateProjectStatus(
  projectId: string,
  status: (typeof PROJECT_STATUSES)[number],
): Promise<ActionResult> {
  if (!PROJECT_STATUSES.includes(status)) {
    return { ok: false, error: "Некорректный статус проекта." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("projects")
    .update({ status })
    .eq("id", projectId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/");
  return { ok: true, id: projectId };
}

export async function addProjectComment(
  projectId: string,
  content: string,
): Promise<ActionResult> {
  const text = content.trim();
  if (!text) return { ok: false, error: "Пустой комментарий" };

  const supabase = createClient();
  const userId = await currentProfileId(supabase);

  const { error } = await supabase.from("comments").insert({
    entity_type: "project",
    entity_id: projectId,
    user_id: userId,
    content: text,
    type: "comment",
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
