const { expect, test } = require("@playwright/test");

const severeConsoleTypes = new Set(["error"]);

function collectBrowserErrors(page) {
  const errors = [];

  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  page.on("console", (message) => {
    if (severeConsoleTypes.has(message.type())) {
      errors.push(`console ${message.type()}: ${message.text()}`);
    }
  });

  return errors;
}

const itemTitle = "浮世絵 三枚続　相撲場面（額装）";

test("items list shows the product card and links to its detail page", async ({ page }) => {
  const errors = collectBrowserErrors(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/items/");

  const card = page.locator(".items-entry", { hasText: itemTitle });
  await expect(card).toBeVisible();
  await expect(card.locator("img")).toBeVisible();
  await expect(card.getByText("江戸時代の浮世絵とみられる三枚続")).toBeVisible();

  await card.getByRole("link", { name: /詳しく見る/ }).click();

  await expect(page).toHaveURL(/\/items\/ukiyoe-001\/$/);
  await expect(page.getByRole("heading", { name: itemTitle })).toBeVisible();
  await expect(page.getByRole("heading", { name: "作品概要" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "状態" })).toBeVisible();
  await expect(page.getByRole("link", { name: /お問い合わせへ/ })).toBeVisible();

  await page.screenshot({ path: "test-results/items-detail-desktop.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("item detail page holds up at 390px", async ({ page }) => {
  const errors = collectBrowserErrors(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/items/ukiyoe-001/");

  await expect(page.getByRole("heading", { name: itemTitle })).toBeVisible();

  const image = page.locator(".item-detail__figure img");
  await expect(image).toBeVisible();
  const box = await image.boundingBox();
  expect(box).not.toBeNull();
  // Image must not overflow the 390px viewport.
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390 + 1);

  await expect(page.getByText("御殿と庭園を背景に")).toBeVisible();
  await expect(page.getByRole("link", { name: /お問い合わせへ/ })).toBeVisible();

  await page.screenshot({ path: "test-results/items-detail-mobile.png", fullPage: true });
  expect(errors).toEqual([]);
});
