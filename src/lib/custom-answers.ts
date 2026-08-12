import type { CustomField } from "@/lib/validations/event";

/**
 * 커스텀 필드 답변 표시 — 명단 테이블 셀 · 상세 패널 · CSV가 **이 함수 하나만** 쓴다.
 *
 * 저장 형태가 타입별로 일정하지 않다: 예매 폼은 값을 문자열로 넘기므로 체크박스가
 * `"true"`/`"false"` 문자열로 저장되고(API 스키마는 boolean도 허용), 숫자도 문자열로 온다.
 * 그래서 화면마다 따로 판별하면 "true"가 그대로 노출되는 일이 생긴다(실제 버그였다).
 *
 * 반환값이 `null`이면 **미응답**이다 — 표시 계층이 `—`(테이블)이나 빈 값(CSV)으로 정한다.
 */
export function formatCustomAnswer(
  field: Pick<CustomField, "type">,
  value: unknown
): string | null {
  if (value === undefined || value === null) return null;

  if (field.type === "checkbox") {
    if (typeof value === "boolean") return value ? "예" : "아니오";
    const text = String(value).trim().toLowerCase();
    if (text === "" ) return null;
    if (text === "true" || text === "on" || text === "1") return "예";
    if (text === "false" || text === "off" || text === "0") return "아니오";
    // 예상 밖의 값은 감추지 않고 그대로 보여준다(데이터 확인이 가능해야 한다)
    return String(value);
  }

  const text = typeof value === "string" ? value : String(value);
  return text.trim() === "" ? null : text;
}

/** 검색 대조용 텍스트 — 체크박스는 제외한다("true"로 전원이 걸리는 오탐 방지). */
export function searchableCustomAnswers(
  fields: readonly CustomField[],
  answers: unknown
): string {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return "";
  }
  const map = answers as Record<string, unknown>;
  return fields
    .filter((f) => f.type !== "checkbox")
    .map((f) => formatCustomAnswer(f, map[f.id]) ?? "")
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
