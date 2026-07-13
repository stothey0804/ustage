import { format, parse, isValid } from "date-fns";
import { ko } from "date-fns/locale";

const KST_OFFSET = 9 * 60 * 60 * 1000;

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
 * Vercel 서버(UTC)에서도 한국 시간으로 올바르게 표시됨.
 */
export function formatKST(
  dateStr: string,
  fmt: string = "yyyy년 M월 d일 (EEE) HH:mm"
): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    // UTC → KST 보정 후 format()(로컬 메서드 기반)으로 출력
    const kst = new Date(d.getTime() + KST_OFFSET);
    // format()은 Date의 로컬 메서드를 사용하므로 UTC 서버에서는 kst가 곧 KST 시간
    return format(kst, fmt, { locale: ko });
  } catch {
    return dateStr;
  }
}
