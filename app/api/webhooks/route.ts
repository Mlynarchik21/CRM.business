import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Общий вход для внешних вебхуков (платёжные системы, формы лендингов и т.п.).
 * Пока — заглушка-приёмник: принимает payload и подтверждает доставку.
 * Конкретные обработчики добавляются здесь по мере интеграций.
 */
export async function POST(request: Request) {
  try {
    await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "webhooks" });
}
