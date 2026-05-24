"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createExpense,
  deleteExpense,
  updateExpense,
} from "@/app/(dashboard)/expenses/actions";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PaginationBar } from "@/components/shared/PaginationBar";
import { COLORS, EXPENSE_CATEGORY_LABEL } from "@/lib/constants";
import { EXPENSE_CATEGORIES, type ExpenseFormValues } from "@/lib/validations";
import { cn, formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { Expense } from "@/types";

export type ExpenseRow = Expense & { project_title?: string | null };

const CATEGORY_COLOR: Record<string, string> = {
  ads: COLORS.accentPurple,
  contractors: COLORS.accentOrange,
  tools: COLORS.warning,
  salary: COLORS.accentGreen,
  taxes: COLORS.danger,
  other: COLORS.textMuted,
};

const GRID = "grid grid-cols-[minmax(0,1.6fr)_150px_110px_130px_80px] items-center gap-4";

function emptyDraft(): ExpenseFormValues {
  return { title: "", category: "ads", amount: 0, currency: "USD", spent_at: "", project_id: "", source: "", comment: "" };
}

function toDraft(e: ExpenseRow): ExpenseFormValues {
  return {
    title: e.title,
    category: e.category,
    amount: Number(e.amount ?? 0),
    currency: e.currency ?? "USD",
    spent_at: e.spent_at ?? "",
    project_id: e.project_id ?? "",
    source: e.source ?? "",
    comment: e.comment ?? "",
  };
}

function ExpenseFormDialog({
  open,
  onOpenChange,
  expense,
  projects,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ExpenseRow | null;
  projects: { id: string; title: string }[];
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<ExpenseFormValues>(emptyDraft());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setDraft(expense ? toDraft(expense) : emptyDraft());
  }, [open, expense]);

  function field<K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (!draft.title.trim()) return toast.error("Укажи назначение расхода");
    if (!draft.amount || draft.amount <= 0) return toast.error("Сумма должна быть больше нуля");

    setSubmitting(true);
    const result = expense ? await updateExpense(expense.id, draft) : await createExpense(draft);
    setSubmitting(false);

    if (!result.ok) return toast.error(result.error);
    toast.success(expense ? "Расход обновлён" : "Расход добавлен");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{expense ? "Редактировать расход" : "Новый расход"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Назначение</Label>
            <Input value={draft.title} onChange={(e) => field("title", e.target.value)} placeholder="Реклама в Telegram" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Категория</Label>
              <Select value={draft.category} onValueChange={(v) => field("category", v as ExpenseFormValues["category"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{EXPENSE_CATEGORY_LABEL[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Сумма</Label>
              <Input
                type="number"
                step="0.01"
                value={draft.amount || ""}
                onChange={(e) => field("amount", e.target.value === "" ? 0 : Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Валюта</Label>
              <Input value={draft.currency} onChange={(e) => field("currency", e.target.value)} placeholder="USD" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Дата</Label>
              <Input type="date" value={draft.spent_at} onChange={(e) => field("spent_at", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Проект</Label>
              <Select
                value={draft.project_id || "none"}
                onValueChange={(v) => field("project_id", v === "none" ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="Без проекта" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без проекта</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Источник трафика (для ROI)</Label>
            <Input value={draft.source} onChange={(e) => field("source", e.target.value)} placeholder="telegram / instagram / ads…" />
          </div>

          <div className="space-y-2">
            <Label>Комментарий</Label>
            <Textarea value={draft.comment} onChange={(e) => field("comment", e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Сохранение..." : expense ? "Сохранить" : "Добавить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ExpensesClient({
  expenses,
  projects,
  revenue,
  totalExpenses,
}: {
  expenses: ExpenseRow[];
  projects: { id: string; title: string }[];
  revenue: number;
  totalExpenses: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [pageSize, expenses.length]);

  const profit = revenue - totalExpenses;
  const totalPages = Math.max(1, Math.ceil(expenses.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = expenses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function removeExpense(id: string) {
    startTransition(async () => {
      const result = await deleteExpense(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Расход удалён");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/payments">Оплаты</Link>
            </Button>
            <span className="rounded-md bg-primary/10 px-3 py-1 text-sm font-medium text-primary">Расходы</span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Расходы</h1>
          <p className="text-muted-foreground">
            Затраты студии для расчёта прибыли и ROI источников трафика.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Доход</p>
          <p className="mt-2 text-2xl font-semibold text-primary">{formatCurrency(revenue)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Расход</p>
          <p className="mt-2 text-2xl font-semibold text-destructive">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Прибыль</p>
          <p className={cn("mt-2 text-2xl font-semibold", profit >= 0 ? "text-primary" : "text-destructive")}>
            {formatCurrency(profit)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Записей</p>
          <p className="mt-2 text-2xl font-semibold">{formatNumber(expenses.length)}</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className={cn(GRID, "border-b border-border px-4 py-3 text-sm text-muted-foreground")}>
            <div>Назначение</div>
            <div>Категория</div>
            <div>Сумма</div>
            <div>Дата</div>
            <div className="text-right">Действия</div>
          </div>

          {expenses.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Расходов пока нет. Нажми «Добавить». Если кнопка выдаёт ошибку — примените миграцию 005.
            </div>
          ) : (
            pageRows.map((expense) => (
              <div key={expense.id} className={cn(GRID, "border-b border-border px-4 py-3 last:border-b-0")}>
                <div className="min-w-0">
                  <p className="truncate font-medium">{expense.title}</p>
                  {expense.project_title && (
                    <p className="truncate text-xs text-muted-foreground">{expense.project_title}</p>
                  )}
                </div>
                <div className="min-w-0">
                  <StatusBadge
                    label={EXPENSE_CATEGORY_LABEL[expense.category] ?? expense.category}
                    color={CATEGORY_COLOR[expense.category] ?? COLORS.textMuted}
                  />
                </div>
                <div className="text-sm font-medium">{formatCurrency(expense.amount, expense.currency || "USD")}</div>
                <div className="text-sm text-muted-foreground">
                  {expense.spent_at ? formatDate(expense.spent_at, true) : formatDate(expense.created_at, true)}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={() => { setEditing(expense); setFormOpen(true); }} className="text-muted-foreground hover:text-foreground" aria-label="Изменить">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => removeExpense(expense.id)} className="text-muted-foreground hover:text-destructive" aria-label="Удалить">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}

        </CardContent>
      </Card>

      {expenses.length > 0 && (
        <PaginationBar
          total={expenses.length}
          page={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      )}

      <ExpenseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        expense={editing}
        projects={projects}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
