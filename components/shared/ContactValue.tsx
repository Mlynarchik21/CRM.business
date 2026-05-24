"use client";

import { Copy, ExternalLink, Mail, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type ContactType = "telegram" | "phone" | "email" | "link";

function normalizeTelegram(value: string) {
  const clean = value.trim().replace(/^@/, "");
  return {
    label: value.startsWith("@") ? value : `@${clean}`,
    href: `https://t.me/${clean}`,
  };
}

function getConfig(type: ContactType, value: string) {
  switch (type) {
    case "telegram":
      return { icon: MessageCircle, ...normalizeTelegram(value) };
    case "phone":
      return {
        icon: Phone,
        label: value,
        href: `tel:${value.replace(/\s+/g, "")}`,
      };
    case "email":
      return {
        icon: Mail,
        label: value,
        href: `mailto:${value}`,
      };
    case "link":
      return {
        icon: ExternalLink,
        label: value,
        href: value,
      };
  }
}

export function ContactValue({
  type,
  value,
}: {
  type: ContactType;
  value?: string | null;
}) {
  if (!value) {
    return <span className="text-sm font-medium text-muted-foreground">—</span>;
  }

  const safeValue = value;
  const config = getConfig(type, safeValue);
  const Icon = config.icon;

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(safeValue);
      toast.success("Скопировано");
    } catch {
      toast.error("Не удалось скопировать");
    }
  }

  return (
    <div className="inline-flex max-w-full items-center justify-end gap-1.5">
      <a
        href={config.href}
        target={type === "link" || type === "telegram" ? "_blank" : undefined}
        rel={type === "link" || type === "telegram" ? "noreferrer" : undefined}
        className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{config.label}</span>
      </a>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0"
        onClick={onCopy}
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}
