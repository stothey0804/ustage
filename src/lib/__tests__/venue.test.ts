import { describe, expect, it } from "vitest";
import { extraAddress, venueLabel } from "../venue";

describe("venueLabel", () => {
  it("주소가 없으면 입력한 장소 그대로", () => {
    expect(venueLabel("홍대 클럽 B1")).toBe("홍대 클럽 B1");
  });
  it("장소에 주소가 이미 들어 있으면 덧붙이지 않는다", () => {
    expect(venueLabel("서울 마포구 와우산로 1 (OO빌딩) 3층", "서울 마포구 와우산로 1")).toBe(
      "서울 마포구 와우산로 1 (OO빌딩) 3층"
    );
  });
  it("장소에 없는 주소는 괄호로 덧붙인다", () => {
    expect(venueLabel("OO홀 3층", "서울 마포구 와우산로 1")).toBe(
      "OO홀 3층 (서울 마포구 와우산로 1)"
    );
    expect(extraAddress("OO홀 3층", "서울 마포구 와우산로 1")).toBe("서울 마포구 와우산로 1");
  });
});
