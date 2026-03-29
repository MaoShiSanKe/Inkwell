import { expect, test } from "@playwright/test";

const ADMIN_PATH = process.env.PLAYWRIGHT_ADMIN_PATH?.trim() || "admin";

test.describe("theme toggle browser regression", () => {
  test("keeps the theme toggle available across public and admin routes", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("button", { name: "切换深色模式" })).toBeVisible();
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    await page.getByRole("button", { name: "切换深色模式" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("button", { name: "切换深色模式" })).toContainText("浅色模式");

    await page.goto("/search");
    await expect(page.getByRole("button", { name: "切换深色模式" })).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("button", { name: "切换深色模式" })).toContainText("浅色模式");

    await page.goto(`/${ADMIN_PATH}/login`);
    await expect(page.getByRole("button", { name: "切换深色模式" })).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("button", { name: "切换深色模式" })).toContainText("浅色模式");
  });
});
