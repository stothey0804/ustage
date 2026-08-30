"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

import {
  inviteEventStaff,
  removeEventStaff,
  resendStaffInvite,
} from "@/app/actions/staff";
import {
  staffInviteSchema,
  type StaffInviteValues,
} from "@/lib/validations/staff";
import { formatKST } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type StaffRow = {
  id: string;
  invited_email: string;
  status: string;
  invited_at: string;
  accepted_at: string | null;
};

interface Props {
  eventId: string;
  staff: StaffRow[];
}

/**
 * 스태프 관리 — 소유자에게만 보인다.
 *
 * 가입 여부를 조회하지 않고 이메일로 초대 링크를 보낸다(계정 열거 방지).
 * 초대받은 사람이 링크를 누르고 로그인하면 그 계정이 스태프로 연결된다.
 */
export function StaffPanel({ eventId, staff }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [removeTarget, setRemoveTarget] = useState<StaffRow | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StaffInviteValues>({
    resolver: zodResolver(staffInviteSchema),
    defaultValues: { email: "" },
  });

  function invite(values: StaffInviteValues) {
    startTransition(async () => {
      const result = await inviteEventStaff(eventId, values.email);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      // 가입 여부를 알려주지 않기 위해 항상 같은 문구로 안내한다
      toast.success("초대 메일을 보냈습니다.");
      reset();
      router.refresh();
    });
  }

  function resend(row: StaffRow) {
    startTransition(async () => {
      const result = await resendStaffInvite(row.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("초대 메일을 다시 보냈습니다.");
      router.refresh();
    });
  }

  function remove() {
    if (!removeTarget) return;
    const id = removeTarget.id;
    setRemoveTarget(null);
    startTransition(async () => {
      const result = await removeEventStaff(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("스태프에서 제외했습니다.");
      router.refresh();
    });
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="space-y-4 rounded-4xl bg-card p-5 shadow-md ring-1 ring-foreground/5">
        <div className="space-y-1">
          <h2 className="text-15 font-semibold">스태프</h2>
          <p className="text-13 leading-relaxed text-muted-foreground">
            함께 현장을 운영할 사람을 초대합니다. 스태프는{" "}
            <span className="font-medium text-foreground">
              명단 확인 · 입금 확인 · QR 입장 처리 · 현장 예매 · 추첨
            </span>
            을 할 수 있고, 스테이지 수정·삭제와 스태프 관리는 주최자만 할 수 있어요.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            참석자의 이름·이메일을 보게 되므로 믿을 수 있는 사람만 초대해 주세요.
          </p>
        </div>

        <Separator />

        <form
          onSubmit={handleSubmit(invite)}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="min-w-56 flex-1 space-y-1.5">
            <Label htmlFor="staff-email">초대할 이메일</Label>
            <Input
              id="staff-email"
              type="email"
              placeholder="staff@example.com"
              autoComplete="off"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <Button type="submit" size="lg" className="gap-1.5" disabled={isPending}>
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserPlus className="size-4" />
            )}
            초대
          </Button>
        </form>

        <p className="text-xs text-muted-foreground">
          어스테이지에 가입된 이메일만 초대할 수 있어요. 초대 링크는 7일 후
          만료됩니다.
        </p>
      </div>

      {staff.length > 0 && (
        <div className="space-y-3 rounded-4xl bg-card p-5 shadow-md ring-1 ring-foreground/5">
          <h3 className="text-13 font-semibold">
            초대한 사람 {staff.length}명
          </h3>
          <ul className="divide-y rounded-3xl border">
            {staff.map((row) => {
              const accepted = row.status === "accepted";
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center gap-3 px-3.5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-13 font-medium">
                      {row.invited_email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {accepted
                        ? `참여 중 · ${formatKST(row.accepted_at ?? row.invited_at, "M월 d일")}`
                        : `초대 대기 · ${formatKST(row.invited_at, "M월 d일")}`}
                    </p>
                  </div>

                  <span
                    className={
                      accepted
                        ? "inline-flex h-5 items-center gap-1.5 rounded-full bg-primary/10 px-2 text-xs font-medium text-primary"
                        : "inline-flex h-5 items-center gap-1.5 rounded-full bg-secondary px-2 text-xs font-medium text-muted-foreground"
                    }
                  >
                    <span className="size-1.5 rounded-full bg-current" />
                    {accepted ? "참여 중" : "대기"}
                  </span>

                  {!accepted && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="gap-1"
                      disabled={isPending}
                      onClick={() => resend(row)}
                    >
                      <Mail className="size-3.5" />
                      재발송
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="gap-1 text-destructive hover:text-destructive"
                    disabled={isPending}
                    onClick={() => setRemoveTarget(row)}
                  >
                    <X className="size-3.5" />
                    제외
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Dialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>스태프 제외</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {removeTarget?.invited_email}
            </span>
            을 스태프에서 제외합니다. 이 스테이지의 명단·입장 처리 권한이 즉시
            사라집니다.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveTarget(null)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button variant="destructive" onClick={remove} disabled={isPending}>
              제외
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
