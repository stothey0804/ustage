"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  const router = useRouter();
  // 링크(code 교환)로 세션이 생겨야 재설정 가능 — 세션 유효성 확인
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setReady(data.user ? "ok" : "invalid");
    });
  }, []);

  async function onSubmit(values: ResetPasswordValues) {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });
    if (error) {
      console.error("[auth] reset update error", error);
      setServerError("비밀번호 변경에 실패했습니다. 다시 시도해 주세요.");
      return;
    }
    toast.success("비밀번호가 변경되었습니다.");
    router.replace("/dashboard");
  }

  if (ready === "checking") {
    return (
      <p className="text-center text-sm text-muted-foreground">확인 중…</p>
    );
  }

  if (ready === "invalid") {
    return (
      <div className="space-y-3 rounded-2xl border bg-muted/30 p-6 text-center">
        <p className="font-medium">링크가 만료되었어요</p>
        <p className="text-sm text-muted-foreground">
          비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다. 다시 요청해
          주세요.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/forgot-password">재설정 메일 다시 보내기</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">새 비밀번호</Label>
        <Input
          id="password"
          type="password"
          placeholder="6자 이상"
          autoComplete="new-password"
          {...register("password")}
        />
        {errors.password ? (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword ? (
          <p className="text-sm text-destructive">
            {errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      {serverError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {serverError}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "변경 중…" : "비밀번호 변경"}
      </Button>
    </form>
  );
}
