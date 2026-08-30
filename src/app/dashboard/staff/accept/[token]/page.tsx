import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleCheck, TriangleAlert } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { acceptStaffInvite } from "@/app/actions/staff";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "스태프 초대",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ token: string }>;
}

/**
 * 스태프 초대 수락.
 *
 * `/dashboard` 하위라 proxy가 로그인을 강제하고, 카카오 계정이면 이메일 등록 온보딩까지
 * 거친 뒤 이 경로로 되돌아온다. 그래서 미가입자 초대도 별도 처리 없이 같은 흐름으로 끝난다.
 * 수락되는 계정은 **링크를 누른 그 세션의 계정**이다(초대 이메일과 일치 강제하지 않음 —
 * 카카오 계정은 계정 이메일이 비어 있을 수 있다).
 */
export default async function AcceptStaffInvitePage({ params }: Props) {
  const { token } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(`/dashboard/staff/accept/${token}`)}`
    );
  }

  const result = await acceptStaffInvite(token);

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-5 py-16 text-center">
      {result.success ? (
        <>
          <CircleCheck className="size-10 text-primary" strokeWidth={1.5} />
          <div className="space-y-1.5">
            <p className="text-15 font-semibold">
              스태프로 참여했습니다
            </p>
            <p className="text-13 leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">
                {result.eventTitle}
              </span>
              의 예매 명단과 입장 처리를 도울 수 있어요. 내 스테이지 목록에서 바로
              들어갈 수 있습니다.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <Button asChild size="lg">
              <Link href={`/dashboard/events/${result.eventId}`}>
                스테이지 열기
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/dashboard/events">내 스테이지 목록</Link>
            </Button>
          </div>
        </>
      ) : (
        <>
          <TriangleAlert className="size-10 text-muted-foreground/60" strokeWidth={1.5} />
          <div className="space-y-1.5">
            <p className="text-15 font-semibold">초대를 수락할 수 없습니다</p>
            <p className="text-13 leading-relaxed text-muted-foreground">
              {result.error}
            </p>
          </div>
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard">대시보드로</Link>
          </Button>
        </>
      )}
    </div>
  );
}
