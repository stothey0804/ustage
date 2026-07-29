import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserIdentity } from "@supabase/supabase-js";

import { AccountIdentities } from "@/components/auth/AccountIdentities";

const unlinkMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      unlinkIdentity: (...args: unknown[]) => unlinkMock(...args),
      linkIdentity: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

function identity(provider: string): UserIdentity {
  return {
    identity_id: `${provider}-id`,
    id: `${provider}-user`,
    user_id: "user-1",
    identity_data: {},
    provider,
    created_at: "2026-07-01T00:00:00Z",
    last_sign_in_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
  } as UserIdentity;
}

function rowOf(label: string) {
  return screen.getByText(label).closest("li") as HTMLElement;
}

beforeEach(() => {
  unlinkMock.mockReset();
  unlinkMock.mockResolvedValue({ error: null });
});

describe("AccountIdentities", () => {
  it("이메일은 연결 해제 버튼을 노출하지 않고 이유를 보여준다", () => {
    render(
      <AccountIdentities identities={[identity("email"), identity("kakao")]} />,
    );

    const emailRow = rowOf("이메일 + 비밀번호");
    expect(
      within(emailRow).queryByRole("button", { name: /연결 해제/ }),
    ).not.toBeInTheDocument();
    expect(
      within(emailRow).getByText(/안내 메일·비밀번호 재설정에 쓰여요/),
    ).toBeInTheDocument();
  });

  it("다른 수단이 남아 있으면 카카오는 해제할 수 있다", async () => {
    const u = userEvent.setup();
    render(
      <AccountIdentities identities={[identity("email"), identity("kakao")]} />,
    );

    const kakaoRow = rowOf("카카오");
    await u.click(within(kakaoRow).getByRole("button", { name: /연결 해제/ }));

    expect(unlinkMock).toHaveBeenCalledTimes(1);
    expect(unlinkMock.mock.calls[0][0]).toMatchObject({ provider: "kakao" });
  });

  it("카카오만 남은 계정은 해제 버튼을 감춘다 (로그인 수단이 사라지므로)", () => {
    render(<AccountIdentities identities={[identity("kakao")]} />);

    expect(
      screen.queryByRole("button", { name: /연결 해제/ }),
    ).not.toBeInTheDocument();
  });
});
