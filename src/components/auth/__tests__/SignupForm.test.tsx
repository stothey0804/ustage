import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignupForm } from "@/components/auth/SignupForm";

const signUpMock = vi.fn();
const resendMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signUp: (...args: unknown[]) => signUpMock(...args),
      resend: (...args: unknown[]) => resendMock(...args),
    },
  }),
}));

async function fillAndSubmit(
  email = "new@example.com",
  password = "secret123",
  confirm = password,
) {
  const u = userEvent.setup();
  await u.type(screen.getByLabelText("이메일"), email);
  await u.type(screen.getByLabelText("비밀번호"), password);
  await u.type(screen.getByLabelText("비밀번호 확인"), confirm);
  await u.click(screen.getByRole("button", { name: "회원가입" }));
}

beforeEach(() => {
  signUpMock.mockReset();
  resendMock.mockReset();
});

describe("SignupForm", () => {
  it("비밀번호 불일치는 클라이언트에서 막는다", async () => {
    render(<SignupForm />);
    await fillAndSubmit("new@example.com", "secret123", "different");
    expect(
      await screen.findByText("비밀번호가 일치하지 않습니다."),
    ).toBeInTheDocument();
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it("가입 성공(이메일 확인 필요) 시 인증 안내와 재발송 버튼을 보여준다", async () => {
    signUpMock.mockResolvedValue({
      data: { user: { identities: [{ id: "i1" }] }, session: null },
      error: null,
    });
    render(<SignupForm />);
    await fillAndSubmit();

    expect(
      await screen.findByText("인증 메일을 발송했습니다."),
    ).toBeInTheDocument();
    expect(screen.getByText("new@example.com")).toBeInTheDocument();

    // 재발송 버튼은 쿨다운 상태로 시작
    const resendBtn = screen.getByRole("button", { name: /인증 메일 재발송/ });
    expect(resendBtn).toBeDisabled();

    // emailRedirectTo가 앱 콜백을 가리켜야 한다
    expect(signUpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "new@example.com",
        options: expect.objectContaining({
          // 메일 템플릿이 뒤에 &token_hash=…를 붙이므로 쿼리스트링까지 있어야 한다
          emailRedirectTo: expect.stringContaining("/auth/callback?next="),
        }),
      }),
    );
  });

  it("이미 가입된 이메일(identities 빈 배열)을 감지한다", async () => {
    signUpMock.mockResolvedValue({
      data: { user: { identities: [] }, session: null },
      error: null,
    });
    render(<SignupForm />);
    await fillAndSubmit();
    expect(
      await screen.findByText("이미 가입된 이메일입니다. 로그인해 주세요."),
    ).toBeInTheDocument();
  });

  it("User already registered 에러를 한국어로 안내한다", async () => {
    signUpMock.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "User already registered" },
    });
    render(<SignupForm />);
    await fillAndSubmit();
    expect(
      await screen.findByText("이미 가입된 이메일입니다."),
    ).toBeInTheDocument();
  });

  it("이미 가입된 주소라면 로그인 링크를 함께 준다", async () => {
    // 휴대폰(인앱브라우저)에서 인증을 마치고 이 화면으로 돌아온 경우가 대부분이라
    // 다음 행동인 '로그인'으로 바로 갈 수 있어야 한다
    signUpMock.mockResolvedValue({
      data: { user: { identities: [] }, session: null },
      error: null,
    });
    render(<SignupForm next="/dashboard/events" />);
    await fillAndSubmit();

    const link = await screen.findByRole("link", { name: "로그인 화면으로 이동" });
    expect(link).toHaveAttribute(
      "href",
      "/login?next=%2Fdashboard%2Fevents",
    );
  });

  it("대기 화면에서 '다른 이메일로 다시 가입'을 누르면 이메일이 비워진 폼으로 돌아간다", async () => {
    // 인증 메일이 끝내 오지 않는 경우(휴면 메일함 등)의 탈출구
    signUpMock.mockResolvedValue({
      data: { user: { identities: [{ provider: "email" }] }, session: null },
      error: null,
    });
    const u = userEvent.setup();
    render(<SignupForm />);
    await fillAndSubmit();

    await u.click(
      await screen.findByRole("button", { name: /다른 이메일로 다시 가입/ }),
    );
    const email = screen.getByLabelText("이메일") as HTMLInputElement;
    expect(email.value).toBe("");
    // 비밀번호 입력은 유지된다 (다시 치지 않아도 됨)
    expect(screen.getByLabelText("비밀번호")).toHaveValue("secret123");
  });

  it("메일 발송 대기 화면에서 '인증은 링크를 연 브라우저에서'를 안내하고 로그인 경로를 준다", async () => {
    signUpMock.mockResolvedValue({
      data: { user: { identities: [{ provider: "email" }] }, session: null },
      error: null,
    });
    render(<SignupForm />);
    await fillAndSubmit();

    expect(
      await screen.findByText(/인증은/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /인증을 마쳤어요/ }),
    ).toHaveAttribute("href", "/login?next=%2Fdashboard");
  });
});
