import { describe, expect, it } from "vitest";
import { sanitizeEventHtml } from "@/lib/sanitize";

describe("sanitizeEventHtml", () => {
  it("CKEditor가 만드는 기본 태그는 유지한다", () => {
    const html =
      "<h2>안내</h2><p><strong>중요</strong> 내용</p><ul><li>항목</li></ul><blockquote>인용</blockquote>";
    expect(sanitizeEventHtml(html)).toBe(html);
  });

  it("script 태그를 제거한다", () => {
    expect(sanitizeEventHtml('<p>안전</p><script>alert("x")</script>')).toBe(
      "<p>안전</p>",
    );
  });

  it("iframe을 제거한다", () => {
    expect(
      sanitizeEventHtml('<iframe src="https://evil.com"></iframe><p>본문</p>'),
    ).toBe("<p>본문</p>");
  });

  it("이벤트 핸들러 속성을 제거한다", () => {
    expect(sanitizeEventHtml('<p onclick="alert(1)">클릭</p>')).toBe(
      "<p>클릭</p>",
    );
    expect(sanitizeEventHtml('<img src="https://a.com/x.png" onerror="x()">')).toBe(
      '<img src="https://a.com/x.png" />',
    );
  });

  it("링크에 rel/target을 강제하고 javascript: 스킴을 제거한다", () => {
    expect(sanitizeEventHtml('<a href="https://a.com">링크</a>')).toBe(
      '<a href="https://a.com" rel="noopener noreferrer" target="_blank">링크</a>',
    );
    const out = sanitizeEventHtml('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain("javascript:");
  });

  it("style 속성과 미허용 태그는 제거하되 텍스트는 남긴다", () => {
    expect(sanitizeEventHtml('<p style="color:red">텍스트</p>')).toBe(
      "<p>텍스트</p>",
    );
    expect(sanitizeEventHtml("<video>영상</video>")).toBe("영상");
  });
});
