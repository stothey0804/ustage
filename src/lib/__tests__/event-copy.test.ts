import { describe, expect, it } from "vitest";

import { copyEventFormValues } from "../event-copy";

const EVENT = {
  title: "봄 공연",
  description: "<p>안내</p>",
  booking_notice: null,
  cancel_policy: "<p>환불 불가</p>",
  venue: "소극장",
  venue_address: null,
  venue_lat: null,
  venue_lng: null,
  price: 10000,
  onsite_price: 15000,
  bank_info: "카카오뱅크 3333",
  contact: "010-0000-0000",
  capacity: 50,
  custom_fields: [{ id: "f1", label: "소속", type: "text", required: true }],
};

describe("copyEventFormValues", () => {
  it("내용·가격·커스텀 필드를 옮긴다", () => {
    const v = copyEventFormValues(EVENT);
    expect(v.title).toBe("봄 공연");
    expect(v.onsite_price).toBe(15000);
    expect(v.capacity).toBe(50);
    expect(v.custom_fields).toEqual(EVENT.custom_fields);
    expect(v.booking_notice).toBe("");
  });

  it("일시와 포스터는 옮기지 않는다", () => {
    const v = copyEventFormValues(EVENT);
    expect(v).not.toHaveProperty("event_date");
    expect(v).not.toHaveProperty("booking_start");
    expect(v).not.toHaveProperty("booking_end");
    expect(v).not.toHaveProperty("poster_url");
  });

  it("NULL 현장가는 '온라인과 동일'(undefined)로 둔다", () => {
    expect(copyEventFormValues({ ...EVENT, onsite_price: null }).onsite_price).toBeUndefined();
  });
});
