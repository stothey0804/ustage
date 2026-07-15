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
          emailRedirectTo: expect.stringContaining("/auth/callback"),
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
});
