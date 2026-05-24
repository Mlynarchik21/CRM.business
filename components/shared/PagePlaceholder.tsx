export function PagePlaceholder({
  title,
  stage,
}: {
  title: string;
  stage: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-md text-muted-foreground">
        Раздел в разработке. Будет реализован на этапе: {stage}.
      </p>
    </div>
  );
}
