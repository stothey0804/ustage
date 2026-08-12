import { describe, expect, it } from "vitest";
import {
  DRAFT_MAX_AGE_MS,
  DRAFT_VERSION,
  eventDraftKey,
  parseDraft,
  serializeDraft,
} from "@/lib/form-draft";

const NOW = new Date("2026-08-12T10:00:00Z").getTime();
const SAVED_AT = "2026-08-12T09:00:00.000Z";

describe("eventDraftKey", () => {
  it("계정별로 키가 갈린다 (공용 브라우저에서 남의 초안이 보이지 않게)", () => {
    expect(eventDraftKey("u1")).not.toBe(eventDraftKey("u2"));
    expect(eventDraftKey("u1")).toContain(`v${DRAFT_VERSION}`);
  });
});

describe("parseDraft", () => {
  it("직렬화한 값을 그대로 되살린다", () => {
    const raw = serializeDraft({ title: "여름 스테이지" }, SAVED_AT);
    const draft = parseDraft<{ title: string }>(raw, { now: NOW });
    expect(draft?.values.title).toBe("여름 스테이지");
    expect(draft?.savedAt).toBe(SAVED_AT);
  });

  it("없거나 손상된 값은 null", () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft("")).toBeNull();
    expect(parseDraft("{not json")).toBeNull();
    expect(parseDraft("[]")).toBeNull();
    expect(parseDraft('"문자열"')).toBeNull();
  });

  it("버전이 다르면 폐기한다 (폼 필드가 바뀐 옛 초안)", () => {
    const raw = JSON.stringify({
      version: DRAFT_VERSION + 1,
      savedAt: SAVED_AT,
      values: { title: "x" },
    });
    expect(parseDraft(raw, { now: NOW })).toBeNull();
  });

  it("30일이 지난 초안은 되살리지 않는다", () => {
    const raw = serializeDraft({ title: "x" }, SAVED_AT);
    expect(parseDraft(raw, { now: NOW })).not.toBeNull();
    expect(
      parseDraft(raw, { now: NOW + DRAFT_MAX_AGE_MS + 1 }),
    ).toBeNull();
  });

  it("savedAt·values가 이상하면 폐기한다", () => {
    const bad = (patch: Record<string, unknown>) =>
      JSON.stringify({
        version: DRAFT_VERSION,
        savedAt: SAVED_AT,
        values: { title: "x" },
        ...patch,
      });
    expect(parseDraft(bad({ savedAt: 123 }), { now: NOW })).toBeNull();
    expect(parseDraft(bad({ savedAt: "어제" }), { now: NOW })).toBeNull();
    expect(parseDraft(bad({ values: null }), { now: NOW })).toBeNull();
    expect(parseDraft(bad({ values: "제목" }), { now: NOW })).toBeNull();
  });
});
