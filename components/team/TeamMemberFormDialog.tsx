"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createTeamMember, updateTeamMember } from "@/app/(dashboard)/team/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { ROLES, profileSchema, type ProfileFormValues } from "@/lib/validations";
import type { Profile, Role } from "@/types";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Администратор",
  manager: "Менеджер",
  developer: "Разработчик",
  support: "Поддержка",
};

function defaults(profile?: Profile): ProfileFormValues {
  return {
    full_name: profile?.full_name ?? "",
    role: profile?.role ?? "manager",
    telegram_username: profile?.telegram_username ?? "",
    status: profile?.status ?? "active",
  };
}

export function TeamMemberFormDialog({
  profile,
  open: controlledOpen,
  onOpenChange,
  hideTrigger,
}: {
  profile?: Profile;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(profile);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaults(profile),
  });

  useEffect(() => {
    if (open) reset(defaults(profile));
  }, [open, profile, reset]);

  function setOpen(next: boolean) {
    if (isControlled) onOpenChange?.(next);
    else setUncontrolledOpen(next);
  }

  async function onSubmit(values: ProfileFormValues) {
    setSubmitting(true);
    const result = isEdit
      ? await updateTeamMember(profile!.id, values)
      : await createTeamMember(values);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(isEdit ? "Участник обновлён" : "Участник добавлен");
    setOpen(false);
    if (!isEdit) reset(defaults());
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Добавить участника
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Редактировать участника" : "Новый участник команды"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Имя *</Label>
            <Input id="full_name" {...register("full_name")} placeholder="Иван Петров" />
            {errors.full_name && (
              <p className="text-xs text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Роль</Label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABEL[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Статус</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Активен</SelectItem>
                      <SelectItem value="inactive">Неактивен</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="telegram_username">Telegram</Label>
            <Input
              id="telegram_username"
              {...register("telegram_username")}
              placeholder="@username"
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
