import { describe, expect, it } from "vitest";
import {
  formatCustomAnswer,
  searchableCustomAnswers,
} from "@/lib/custom-answers";
import type { CustomField } from "@/lib/validations/event";

const checkbox: CustomField = {
  id: "c1",
  label: "동의",
  type: "checkbox",
  required: false,
};
const text: CustomField = {
  id: "t1",
  label: "메모",
  type: "text",
  required: false,
};
const select: CustomField = {
  id: "s1",
  label: "연령대",
  type: "select",
  required: true,
  options: ["10대", "20대"],
};
const number: CustomField = {
  id: "n1",
  label: "인원",
  type: "number",
  required: false,
};

describe("formatCustomAnswer", () => {
  it("체크박스는 boolean과 문자열 모두 예/아니오로 보여준다", () => {
    // 예매 폼이 "true"/"false" 문자열로 저장하는 것이 실제 동작이다
    expect(formatCustomAnswer(checkbox, true)).toBe("예");
    expect(formatCustomAnswer(checkbox, "true")).toBe("예");
    expect(formatCustomAnswer(checkbox, false)).toBe("아니오");
    expect(formatCustomAnswer(checkbox, "false")).toBe("아니오");
  });

  it("미응답은 null (표시 계층이 —/빈 값으로 정한다)", () => {
    expect(formatCustomAnswer(checkbox, undefined)).toBeNull();
    expect(formatCustomAnswer(checkbox, null)).toBeNull();
    expect(formatCustomAnswer(checkbox, "")).toBeNull();
    expect(formatCustomAnswer(text, "   ")).toBeNull();
    expect(formatCustomAnswer(text, undefined)).toBeNull();
  });

  it("text·select는 값을 그대로, number는 가공하지 않는다", () => {
    expect(formatCustomAnswer(text, "복도 자리 부탁")).toBe("복도 자리 부탁");
    expect(formatCustomAnswer(select, "20대")).toBe("20대");
    // 저장이 자유 문자열이라 천단위 콤마 같은 가공을 하지 않는다
    expect(formatCustomAnswer(number, "1200")).toBe("1200");
    expect(formatCustomAnswer(number, 1200)).toBe("1200");
    expect(formatCustomAnswer(number, 0)).toBe("0");
  });

  it("예상 밖의 체크박스 값은 감추지 않고 그대로 보여준다", () => {
    expect(formatCustomAnswer(checkbox, "네")).toBe("네");
  });
});

describe("searchableCustomAnswers", () => {
  const fields = [text, select, checkbox, number];

  it("체크박스를 뺀 답변을 소문자로 이어 붙인다", () => {
    const s = searchableCustomAnswers(fields, {
      t1: "Aisle Seat",
      s1: "20대",
      c1: "true",
      n1: 3,
    });
    expect(s).toContain("aisle seat");
    expect(s).toContain("20대");
    expect(s).toContain("3");
    // 체크박스가 들어가면 "true" 검색에 전원이 걸린다
    expect(s).not.toContain("예");
    expect(s).not.toContain("true");
  });

  it("답변이 없거나 형태가 이상하면 빈 문자열", () => {
    expect(searchableCustomAnswers(fields, null)).toBe("");
    expect(searchableCustomAnswers(fields, [1, 2])).toBe("");
    expect(searchableCustomAnswers(fields, {})).toBe("");
  });
});
