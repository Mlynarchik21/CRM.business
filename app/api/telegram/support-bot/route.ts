import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendInternalNotification } from "@/lib/telegram/internal-bot";
import { sendLeadMessage, type TelegramUpdate } from "@/lib/telegram/lead-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GREETING =
  "Это бот поддержки студии. Опишите проблему одним сообщением — " +
  "мы создадим обращение и команда возьмёт его в работу.";

function checkSecret(request: Request): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return true;
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
  if (!message?.text) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const text = message.text.trim();

  if (text.startsWith("/start")) {
    await sendLeadMessage(chatId, GREETING);
    return NextResponse.json({ ok: true });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("support_tickets").insert({
    title: text.slice(0, 200),
    status: "new",
    priority: "medium",
    source: "telegram",
  });

  if (error) {
    console.error("support-bot: ошибка создания тикета", error.message);
  } else {
    await sendInternalNotification(`🆘 <b>Новое обращение в поддержку</b>\n${text.slice(0, 200)}`);
  }

  await sendLeadMessage(chatId, "Обращение создано. Спасибо! Команда скоро ответит.");
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, bot: "support-bot" });
}
