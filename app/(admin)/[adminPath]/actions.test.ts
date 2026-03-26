import { beforeEach, describe, expect, it, vi } from "vitest";

const { loginAdminMock, logoutAdminMock } = vi.hoisted(() => ({
  loginAdminMock: vi.fn(),
  logoutAdminMock: vi.fn(),
}));

vi.mock("@/lib/auth-actions", () => ({
  loginAdmin: loginAdminMock,
  logoutAdmin: logoutAdminMock,
}));

describe("admin wrapper actions", () => {
  beforeEach(() => {
    loginAdminMock.mockReset();
    logoutAdminMock.mockReset();
  });

  it("passes parsed login form values to loginAdmin", async () => {
    const { loginAction } = await import("./actions");
    const formData = new FormData();
    formData.set("adminPath", "admin");
    formData.set("email", "editor@example.com");
    formData.set("password", "secret");
    formData.set("redirectTo", "/admin/posts/42");

    await loginAction(formData);

    expect(loginAdminMock).toHaveBeenCalledWith({
      adminPath: "admin",
      email: "editor@example.com",
      password: "secret",
      redirectTo: "/admin/posts/42",
    });
  });

  it("falls back to a route-based redirect for missing login redirect targets", async () => {
    const { loginAction } = await import("./actions");
    const formData = new FormData();
    formData.set("adminPath", "admin");
    formData.set("email", "editor@example.com");
    formData.set("password", "secret");

    await loginAction(formData);

    expect(loginAdminMock).toHaveBeenCalledWith({
      adminPath: "admin",
      email: "editor@example.com",
      password: "secret",
      redirectTo: "/admin",
    });
  });

  it("passes the form adminPath to logoutAdmin and defaults to admin", async () => {
    const { logoutAction } = await import("./actions");

    const explicitFormData = new FormData();
    explicitFormData.set("adminPath", "dashboard");
    await logoutAction(explicitFormData);

    const emptyFormData = new FormData();
    await logoutAction(emptyFormData);

    expect(logoutAdminMock).toHaveBeenNthCalledWith(1, "dashboard");
    expect(logoutAdminMock).toHaveBeenNthCalledWith(2, "admin");
  });
});
