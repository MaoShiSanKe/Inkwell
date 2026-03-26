import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createAdminSessionCookieMock,
  dbSelectMock,
  deleteAdminSessionCookieMock,
  getAdminPathMock,
  hasAdminSessionSecretMock,
  redirectMock,
  verifyPasswordMock,
} = vi.hoisted(() => ({
  createAdminSessionCookieMock: vi.fn(),
  dbSelectMock: vi.fn(),
  deleteAdminSessionCookieMock: vi.fn(),
  getAdminPathMock: vi.fn(),
  hasAdminSessionSecretMock: vi.fn(),
  redirectMock: vi.fn((destination: string) => {
    throw new RedirectSignal(destination);
  }),
  verifyPasswordMock: vi.fn(),
}));

class RedirectSignal extends Error {
  constructor(readonly destination: string) {
    super(destination);
  }
}

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/auth", () => ({
  ADMIN_ALLOWED_ROLES: ["super_admin", "editor"],
  createAdminSessionCookie: createAdminSessionCookieMock,
  deleteAdminSessionCookie: deleteAdminSessionCookieMock,
  hasAdminSessionSecret: hasAdminSessionSecretMock,
}));

vi.mock("@/lib/settings", () => ({
  getAdminPath: getAdminPathMock,
}));

vi.mock("@/lib/password", () => ({
  verifyPassword: verifyPasswordMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: dbSelectMock,
  },
}));

vi.mock("@/lib/db/schema", () => ({
  users: {
    id: "id",
    email: "email",
    passwordHash: "passwordHash",
    role: "role",
  },
}));

describe("auth actions", () => {
  beforeEach(() => {
    createAdminSessionCookieMock.mockReset();
    deleteAdminSessionCookieMock.mockReset();
    getAdminPathMock.mockReset();
    getAdminPathMock.mockResolvedValue("admin");
    hasAdminSessionSecretMock.mockReset();
    hasAdminSessionSecretMock.mockReturnValue(true);
    redirectMock.mockClear();
    verifyPasswordMock.mockReset();
    dbSelectMock.mockReset();
    dbSelectMock.mockReturnValue(createDbSelectChain());
  });

  it("redirects with auth_config when the session secret is missing", async () => {
    hasAdminSessionSecretMock.mockReturnValue(false);

    const { loginAdmin } = await import("./auth-actions");

    await expect(
      loginAdmin({
        adminPath: "admin",
        email: "editor@example.com",
        password: "secret",
        redirectTo: "/admin/posts/42",
      }),
    ).rejects.toMatchObject({
      destination: "/admin/login?error=auth_config&redirect=%2Fadmin%2Fposts%2F42",
    });

    expect(dbSelectMock).not.toHaveBeenCalled();
  });

  it("redirects with missing_credentials when email or password is absent", async () => {
    const { loginAdmin } = await import("./auth-actions");

    await expect(
      loginAdmin({
        adminPath: "admin",
        email: "   ",
        password: "",
        redirectTo: "/admin/posts/42",
      }),
    ).rejects.toMatchObject({
      destination: "/admin/login?error=missing_credentials&redirect=%2Fadmin%2Fposts%2F42",
    });

    expect(dbSelectMock).not.toHaveBeenCalled();
  });

  it("redirects with invalid_credentials and sanitizes unsafe redirects", async () => {
    setDbUser(null);

    const { loginAdmin } = await import("./auth-actions");

    await expect(
      loginAdmin({
        adminPath: "admin",
        email: "editor@example.com",
        password: "wrong-password",
        redirectTo: "//evil.example.com/steal",
      }),
    ).rejects.toMatchObject({
      destination: "/admin/login?error=invalid_credentials&redirect=%2Fadmin",
    });
  });

  it("creates a signed admin session and redirects to the safe target on success", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    setDbUser({
      id: 42,
      passwordHash: "stored-hash",
      role: "editor",
    });
    verifyPasswordMock.mockReturnValue(true);

    const { loginAdmin } = await import("./auth-actions");

    await expect(
      loginAdmin({
        adminPath: "wrong-admin",
        email: " Editor@Example.com ",
        password: "correct-password",
        redirectTo: "/admin/posts/42",
      }),
    ).rejects.toMatchObject({
      destination: "/admin/posts/42",
    });

    expect(createAdminSessionCookieMock).toHaveBeenCalledTimes(1);
    expect(createAdminSessionCookieMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        role: "editor",
      }),
    );
    expect(verifyPasswordMock).toHaveBeenCalledWith("correct-password", "stored-hash");

    const [{ expiresAt }] = createAdminSessionCookieMock.mock.calls[0];
    expect(expiresAt).toBeInstanceOf(Date);
    expect(expiresAt.getTime()).toBe(1_700_000_000_000 + 1000 * 60 * 60 * 24 * 7);

    now.mockRestore();
  });

  it("deletes the session cookie and redirects to the configured login page on logout", async () => {
    getAdminPathMock.mockResolvedValue("dashboard");

    const { logoutAdmin } = await import("./auth-actions");

    await expect(logoutAdmin("admin")).rejects.toMatchObject({
      destination: "/dashboard/login",
    });

    expect(deleteAdminSessionCookieMock).toHaveBeenCalledTimes(1);
  });
});

function createDbSelectChain() {
  return {
    from: () => ({
      where: () => ({
        limit: async () => currentDbUser ? [currentDbUser] : [],
      }),
    }),
  };
}

let currentDbUser:
  | {
      id: number;
      passwordHash: string;
      role: "super_admin" | "editor";
    }
  | null = null;

function setDbUser(
  user:
    | {
        id: number;
        passwordHash: string;
        role: "super_admin" | "editor";
      }
    | null,
) {
  currentDbUser = user;
}
