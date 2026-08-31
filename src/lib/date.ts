import { format, parse, isValid } from "date-fns";
import { ko } from "date-fns/locale";
import { TZDate } from "@date-fns/tz";

const KST = "Asia/Seoul";

/**
 * DateTimePicker가 만든 "YYYY-MM-DDTHH:mm"(로컬 벽시계 시각)을
 * 사람이 읽기 좋은 한국어 문자열로 변환해 저장/표시한다.
 * 파싱 불가하면 원본을 그대로 반환(자유 입력 하위호환).
 */
export function formatDepositTime(v: string): string {
  if (!v) return v;
  const d = parse(v, "yyyy-MM-dd'T'HH:mm", new Date());
  return isValid(d) ? format(d, "M월 d일 (EEE) HH:mm", { locale: ko }) : v;
}

/**
 * ISO 문자열을 KST 기준으로 포맷.
 * 실행 환경 타임존과 무관하게 같은 결과를 낸다 — Vercel 서버(UTC)든 개발자 로컬(KST)이든
 * 동일하다. 오프셋(+9h)을 손으로 더하지 않고 `TZDate`가 벽시계 계산을 맡는다.
 * (예전 구현은 +9h를 더한 뒤 로컬 메서드로 출력해서 UTC 머신에서만 맞았고,
 * KST 머신에서는 9시간 뒤로 보였다.)
 */
export function formatKST(
  dateStr: string,
  fmt: string = "yyyy년 M월 d일 (EEE) HH:mm"
): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return format(new TZDate(d, KST), fmt, { locale: ko });
  } catch {
    return dateStr;
  }
}

/**
 * 스테이지가 이미 끝났는가 — **시각 비교**로 판정한다.
 *
 * `daysUntil` 같은 24시간 단위 올림으로 판정하면 종료 후 하루까지 "오늘"로 잡혀,
 * 끝난 공연이 홈에는 "공연이 오늘이에요", 티켓 목록에는 "다가오는 티켓"으로 남는다.
 * 종료 기준 시각은 항상 `event_end_date ?? event_date`다.
 */
export function isPastInstant(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return !isNaN(t) && t < Date.now();
}

/** 오늘 기준 남은 일수 (지났으면 음수). D-day 문구 전용 — 종료 판정에는 쓰지 말 것. */
export function daysUntil(iso: string): number {
  const target = new Date(iso).getTime();
  if (isNaN(target)) return 0;
  return Math.ceil((target - Date.now()) / (24 * 60 * 60 * 1000));
}
