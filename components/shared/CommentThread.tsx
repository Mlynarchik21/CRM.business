"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export type ThreadComment = {
  id: string;
  content: string;
  type: string;
  created_at: string;
  author: { full_name: string } | null;
};

export function CommentThread({
  comments,
  add,
}: {
  comments: ThreadComment[];
  add: (content: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (!text.trim()) return;

    setSubmitting(true);
    const result = await add(text);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error ?? "Не удалось добавить комментарий");
      return;
    }

    setText("");
    toast.success("Комментарий добавлен");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Комментарии</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Добавить комментарий..."
            rows={3}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={onSubmit} disabled={submitting || !text.trim()}>
              {submitting ? "Добавление..." : "Добавить"}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока нет комментариев.</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="rounded-lg bg-[#1B1B1F] p-3">
                <div className="mb-1 flex items-center justify-between gap-4">
                  <span className="text-sm font-medium">
                    {comment.author?.full_name ?? "Система"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(comment.created_at, true)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {comment.content}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
