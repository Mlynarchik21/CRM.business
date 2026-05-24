/**
 * Лид-бот: приём заявок от клиентов в Telegram.
 * Утилиты для ответа пользователю через Telegram Bot API.
 * Требует TELEGRAM_LEAD_BOT_TOKEN в .env.local.
 */

const API_BASE = "https://api.telegram.org";

type SendResult = { ok: boolean; error?: string };

/** Ответ пользователю в его чат с лид-ботом. Не бросает исключений. */
export async function sendLeadMessage(
  chatId: number | string,
  text: string,
): Promise<SendResult> {
  const token = process.env.TELEGRAM_LEAD_BOT_TOKEN;
  if (!token) return { ok: false, error: "Telegram lead bot не настроен" };

  try {
    const res = await fetch(`${API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
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

/** Минимальная типизация входящего Telegram-апдейта (то, что нам нужно). */
export type TelegramUpdate = {
  message?: {
    chat: { id: number };
    from?: { id: number; username?: string; first_name?: string };
    text?: string;
  };
};
