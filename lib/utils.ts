import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Денежный формат: 1234.5 → "$1 235" (без копеек, пробел-разделитель) */
export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

/** Число с разделителями: 1234 → "1 234" */
export function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value || 0)
}

/** Дата в формате "21 мая" / "21 мая 2026" */
export function formatDate(value: string | Date, withYear = false) {
  const d = typeof value === "string" ? new Date(value) : value
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  })
}

export function formatDateTime(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Дата и время в зоне GMT+3 (Europe/Moscow, без перехода на летнее время). */
export function formatDateTimeGmt3(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value
  const text = d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  })
  return `${text} (GMT+3)`
}

/** Короткий ID транзакции из uuid: TX-XXXXXXXX */
export function transactionId(id: string) {
  return `TX-${id.slice(0, 8).toUpperCase()}`
}

/** Короткая дата-время: "25.05.2026 13:00" (или "—" если пусто). */
export function formatDateTimeShort(value: string | Date | null | undefined) {
  if (!value) return "—"
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return "—"
  return d
    .toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(",", "")
}
