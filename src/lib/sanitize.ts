import sanitizeHtml from "sanitize-html";

/**
 * 이벤트 안내(description) HTML 정화.
 * CKEditor가 만드는 태그만 허용 — script/iframe/이벤트 핸들러 등은 모두 제거.
 * 서버 컴포넌트에서 dangerouslySetInnerHTML 직전에 반드시 통과시킬 것.
 */
export function sanitizeEventHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "hr",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "h2",
      "h3",
      "h4",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
      "figure",
      "figcaption",
      "img",
      "span",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
        target: "_blank",
      }),
    },
  });
}
