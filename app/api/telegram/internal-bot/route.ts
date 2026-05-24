import { NextResponse } from "next/server";
import { sendInternalNotification } from "@/lib/telegram/internal-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Внутренний бот в основном шлёт уведомления (исходящие).
 * Этот POST принимает входящие апдейты (например, команды от команды)
 * и пока просто подтверждает приём. Расширяется по мере надобности.
 */
export async function POST(request: Request) {
  try {
    await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * GET с ?test=1 шлёт тестовое уведомление в командный чат —
 * удобно проверить, что токен и chat_id настроены верно.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("test") === "1") {
    const result = await sendInternalNotification("✅ Тестовое уведомление из Studio CRM");
    return NextResponse.json(result);
  }
  return NextResponse.json({ ok: true, bot: "internal-bot" });
}
