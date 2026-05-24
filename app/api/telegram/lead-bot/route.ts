import { NextResponse } from "next/server";
import { applyLeadWithDedup } from "@/lib/lead-dedup";
import { createAdminClient } from "@/lib/supabase/server";
import { notifyNewLead } from "@/lib/telegram/internal-bot";
import { sendLeadMessage, type TelegramUpdate } from "@/lib/telegram/lead-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GREETING =
  "Привет! 👋 Это бот студии. Опишите одним сообщением, что хотите заказать " +
  "(сайт, лендинг, Telegram-бот, Mini App, дизайн), и оставьте контакт — мы свяжемся в течение 2 часов.";

/** Опциональная проверка секрета вебхука (Telegram шлёт его заголовком). */
function checkSecret(request: Request): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return true; // секрет не задан — пропускаем
  return request.headers.get("x-telegram-bot-api-secret-token") === expected;
}

export async function POST(request: Request) {
  if (!checkSecret(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const message = update.message;
  if (!message?.text) {
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat.id;
  const text = message.text.trim();

  // Команда /start — приветствие, лид не создаём.
  if (text.startsWith("/start")) {
    await sendLeadMessage(chatId, GREETING);
    return NextResponse.json({ ok: true });
  }

  // Прочий текст трактуем как заявку и фиксируем лид.
  const name =
    message.from?.first_name ||
    (message.from?.username ? `@${message.from.username}` : "Гость Telegram");

  const supabase = createAdminClient();
  const res = await applyLeadWithDedup(supabase, {
    name,
    telegram_id: message.from?.id ?? null,
    telegram_username: message.from?.username ?? null,
    source: "telegram_bot",
    status: "new",
    service_interest: text.slice(0, 200),
    notes: text,
  });

  if (!res.ok) {
    // Логируем, но пользователю отвечаем нейтрально.
    console.error("lead-bot: ошибка создания лида", res.error);
    await sendLeadMessage(chatId, "Заявка получена, скоро свяжемся!");
    return NextResponse.json({ ok: true });
  }

  // Уведомляем команду только если создан новый лид (не при слиянии).
  if (res.result.outcome !== "merged") {
    await notifyNewLead({
      id: res.result.id,
      name,
      service_interest: text.slice(0, 200),
      source: "telegram_bot",
      budget_min: null,
      budget_max: null,
    });
  }

  await sendLeadMessage(
    chatId,
    "Заявка принята! ✅ Свяжемся с вами в течение 2 часов.",
  );

  return NextResponse.json({ ok: true });
}

/** GET — простой healthcheck, чтобы видеть, что роут жив. */
export async function GET() {
  return NextResponse.json({ ok: true, bot: "lead-bot" });
}
