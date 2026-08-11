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
