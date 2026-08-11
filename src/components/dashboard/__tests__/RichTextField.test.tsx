import { useState } from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// 청크 로드·초기화 실패를 재현한다 — 실제로는 배포 직후 옛 청크 요청·오프라인에서 일어난다
vi.mock("../RichTextEditor", () => ({
  RichTextEditor: () => {
    throw new Error("Loading chunk failed");
  },
}));

import { RichTextField } from "../RichTextField";

describe("RichTextField", () => {
  beforeEach(() => {
    // 경계가 잡는 에러라 콘솔 노이즈만 줄인다
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("에디터를 못 불러오면 입력창으로 대체하고 이유를 알려준다", async () => {
    render(<RichTextField value="<p>기존 내용</p>" onChange={() => {}} />);

    const textarea = await waitFor(() => screen.getByRole("textbox"));
    expect(textarea).toHaveValue("<p>기존 내용</p>");
    expect(
      screen.getByText(/서식 편집기를 불러오지 못해/),
    ).toBeInTheDocument();
  });

  it("대체 입력창의 내용도 그대로 폼에 전달한다", async () => {
    const onChange = vi.fn();

    // 폼처럼 값을 되돌려주는 래퍼 — 제어 컴포넌트라 이래야 실제 입력과 같아진다
    function Host() {
      const [value, setValue] = useState("");
      return (
        <RichTextField
          value={value}
          onChange={(v) => {
            onChange(v);
            setValue(v);
          }}
        />
      );
    }

    render(<Host />);

    const textarea = await waitFor(() => screen.getByRole("textbox"));
    await userEvent.type(textarea, "안내");

    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls.at(-1)?.[0]).toBe("안내");
    expect(textarea).toHaveValue("안내");
  });
});
