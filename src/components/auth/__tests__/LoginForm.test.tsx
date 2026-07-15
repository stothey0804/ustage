import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/auth/LoginForm";

const signInMock = vi.fn();
const resendMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: (...args: unknown[]) => signInMock(...args),
      resend: (...args: unknown[]) => resendMock(...args),
    },
  }),
}));

async function fillAndSubmit() {
  const u = userEvent.setup();
  await u.type(screen.getByLabelText("이메일"), "user@example.com");
  await u.type(screen.getByLabelText("비밀번호"), "secret123");
  await u.click(screen.getByRole("button", { name: "로그인" }));
  return u;
}

beforeEach(() => {
  signInMock.mockReset();
  resendMock.mockReset();
});

describe("LoginForm", () => {
  it("잘못된 자격증명 에러를 한국어로 안내한다", async () => {
    signInMock.mockResolvedValue({
      error: { code: "invalid_credentials", message: "Invalid login credentials" },
    });
    render(<LoginForm />);
    await fillAndSubmit();
    expect(
      await screen.findByText("이메일 또는 비밀번호가 올바르지 않습니다."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "인증 메일 재발송" }),
    ).not.toBeInTheDocument();
  });

  it("이메일 미인증 계정이면 안내 + 재발송 버튼을 보여준다", async () => {
    signInMock.mockResolvedValue({
      error: { code: "email_not_confirmed", message: "Email not confirmed" },
    });
    render(<LoginForm />);
    await fillAndSubmit();
    expect(
      await screen.findByText(/이메일 인증이 완료되지 않았습니다/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "인증 메일 재발송" }),
    ).toBeInTheDocument();
  });

  it("재발송 클릭 시 signup 타입으로 재발송하고 완료 안내를 보여준다", async () => {
    signInMock.mockResolvedValue({
      error: { code: "email_not_confirmed", message: "Email not confirmed" },
    });
    resendMock.mockResolvedValue({ error: null });
    render(<LoginForm />);
    const u = await fillAndSubmit();

    await u.click(
      await screen.findByRole("button", { name: "인증 메일 재발송" }),
    );

    expect(
      await screen.findByText(/인증 메일을 다시 보냈습니다/),
    ).toBeInTheDocument();
    expect(resendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "signup",
        email: "user@example.com",
        options: expect.objectContaining({
          emailRedirectTo: expect.stringContaining("/auth/callback"),
        }),
      }),
    );
  });
});
