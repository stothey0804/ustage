import { redirect } from "next/navigation";
import { safeInternalPath } from "@/lib/utils";

/**
 * 로그인 화면은 메인(`/`)으로 통합됐다. 이 경로는 기존 링크·리다이렉트
 * (proxy의 `?next=`, 예매 폼의 로그인 버튼, 메일 링크 등)를 살리기 위한 얇은 리다이렉트다.
 */
interface Props {
  searchParams: Promise<{ next?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { next, error } = await searchParams;

  const params = new URLSearchParams();
  const safeNext = safeInternalPath(next);
  // 기본값(/dashboard)일 때는 파라미터를 붙이지 않는다 — 주소가 깔끔해진다.
  if (safeNext !== "/dashboard") params.set("next", safeNext);
  if (error) params.set("error", error);

  const query = params.toString();
  redirect(query ? `/?${query}` : "/");
}
