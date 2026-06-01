/** Компактная строка «лейбл → значение» для карточек клиента/лида. */
export function ProfileField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0 text-right text-sm">
        {value || <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  );
}
