import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import { useUnsavedWarning } from "@/hooks/useUnsavedWarning";

function Probe({ enabled }: { enabled: boolean }) {
  useUnsavedWarning(enabled);
  return null;
}

/** beforeunload를 실제로 발생시켜 브라우저가 확인창을 띄울 조건이 되는지 본다. */
function fireBeforeUnload(): boolean {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

describe("useUnsavedWarning", () => {
  it("작성 중이면 이탈을 막는다", () => {
    render(<Probe enabled />);
    expect(fireBeforeUnload()).toBe(true);
  });

  it("작성 중이 아니면 막지 않는다", () => {
    render(<Probe enabled={false} />);
    expect(fireBeforeUnload()).toBe(false);
  });

  it("언마운트하면 리스너를 정리한다", () => {
    const { unmount } = render(<Probe enabled />);
    unmount();
    expect(fireBeforeUnload()).toBe(false);
  });

  it("enabled가 꺼지면 더 이상 막지 않는다", () => {
    const { rerender } = render(<Probe enabled />);
    rerender(<Probe enabled={false} />);
    expect(fireBeforeUnload()).toBe(false);
  });

  it("리스너를 중복 등록하지 않는다", () => {
    const add = vi.spyOn(window, "addEventListener");
    const { rerender } = render(<Probe enabled />);
    rerender(<Probe enabled />);
    const calls = add.mock.calls.filter(([type]) => type === "beforeunload");
    expect(calls).toHaveLength(1);
    add.mockRestore();
  });
});
