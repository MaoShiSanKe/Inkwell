import { expect, test } from "@playwright/test";

test.describe("theme toggle browser regression", () => {
  test("toggles dark mode on the public homepage and persists preference after reload", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("button", { name: "切换深色模式" })).toBeVisible();
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    await page.getByRole("button", { name: "切换深色模式" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("button", { name: "切换深色模式" })).toContainText("浅色模式");

    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("button", { name: "切换深色模式" })).toContainText("浅色模式");
  });
});
