const { expect, test } = require("@playwright/test");

const severeConsoleTypes = new Set(["error"]);

function collectBrowserErrors(page) {
  const errors = [];

  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  page.on("console", (message) => {
    if (severeConsoleTypes.has(message.type())) {
      if (message.text() === "Failed to load resource: net::ERR_CONNECTION_REFUSED") {
        return;
      }
      errors.push(`console ${message.type()}: ${message.text()}`);
    }
  });

  return errors;
}

test("about page is reachable from navigation on desktop", async ({ page }) => {
  const errors = collectBrowserErrors(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.getByRole("link", { name: "時継舎について" }).first().click();

  await expect(page).toHaveURL(/\/about\/$/);
  await expect(page.getByRole("heading", { name: "時継舎について" })).toBeVisible();
  await expect(page.getByText("栃木県公安委員会")).toBeVisible();
  await expect(page.getByText("第411030001366号")).toBeVisible();

  await page.screenshot({ path: "test-results/about-desktop.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("about page renders required content on mobile", async ({ page }) => {
  const errors = collectBrowserErrors(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/about/");

  await expect(page.getByRole("heading", { name: "時継舎について" })).toBeVisible();
  await expect(page.getByText("栃木県公安委員会")).toBeVisible();
  await expect(page.getByText("第411030001366号")).toBeVisible();

  await page.screenshot({ path: "test-results/about-mobile.png", fullPage: true });
  expect(errors).toEqual([]);
});
