/**
 * Внутренний бот уведомлений команды.
 * Шлёт сообщения в командный чат через Telegram Bot API.
 * Требует TELEGRAM_INTERNAL_BOT_TOKEN и TELEGRAM_INTERNAL_CHAT_ID в .env.local.
 */

import { formatCurrency } from "@/lib/utils";

const API_BASE = "https://api.telegram.org";

type SendResult = { ok: boolean; error?: string };

/** Низкоуровневая отправка текста в командный чат. Никогда не бросает исключение. */
export async function sendInternalNotification(text: string): Promise<SendResult> {
  const token = process.env.TELEGRAM_INTERNAL_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_INTERNAL_CHAT_ID;

  if (!token || !chatId) {
    // Токены ещё не настроены — тихо пропускаем, чтобы не ломать основной поток.
    return { ok: false, error: "Telegram internal bot не настроен" };
  }

  try {
    const res = await fetch(`${API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Telegram API ${res.status}: ${body}` };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "fetch error" };
  }
}

function appUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `${base}${path}`;
}

/** 🔥 Новый лид */
export function notifyNewLead(lead: {
  id: string;
  name: string;
  service_interest?: string | null;
  source: string;
  budget_min?: number | null;
  budget_max?: number | null;
}): Promise<SendResult> {
  const budget =
    lead.budget_min || lead.budget_max
      ? `${formatCurrency(lead.budget_min ?? 0)}–${formatCurrency(lead.budget_max ?? 0)}`
      : "не указан";

  const text = [
    "🔥 <b>Новый лид</b>",
    `Имя: ${lead.name}`,
    `Услуга: ${lead.service_interest || "—"}`,
    `Бюджет: ${budget}`,
    `Источник: ${lead.source}`,
    appUrl(`/leads/${lead.id}`),
  ].join("\n");

  return sendInternalNotification(text);
}

/** 💰 Новая оплата */
export function notifyPayment(payment: {
  amount: number;
  currency?: string;
  clientName?: string | null;
  projectTitle?: string | null;
}): Promise<SendResult> {
  const text = [
    `💰 <b>Оплата получена: ${formatCurrency(payment.amount, payment.currency || "USD")}</b>`,
    `Клиент: ${payment.clientName || "—"}`,
    `Проект: ${payment.projectTitle || "—"}`,
  ].join("\n");

  return sendInternalNotification(text);
}

/** ⚠️ Дедлайн завтра */
export function notifyDeadline(project: {
  title: string;
  clientName?: string | null;
  managerName?: string | null;
}): Promise<SendResult> {
  const text = [
    `⚠️ <b>Дедлайн завтра: ${project.title}</b>`,
    `Клиент: ${project.clientName || "—"}`,
    `Ответственный: ${project.managerName || "—"}`,
  ].join("\n");

  return sendInternalNotification(text);
}
