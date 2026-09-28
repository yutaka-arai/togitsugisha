const { expect, test } = require("@playwright/test");

async function lastGaEvent(page, eventName) {
  // dataLayer entries are pushed as `arguments` (array-like, not a real
  // Array), so they arrive here as plain objects with numeric keys once
  // serialized -- index with [0]/[1]/[2] rather than Array.isArray/filter.
  const dataLayer = await page.evaluate(() => window.dataLayer || []);
  const matches = dataLayer.filter(
    (entry) => entry && entry[0] === "event" && entry[1] === eventName
  );
  return matches.length > 0 ? matches[matches.length - 1] : null;
}

// For links that trigger a real page navigation, the click and the
// dataLayer read must happen inside the same evaluate() call: once
// Playwright's own await resolves after a real navigation, the new
// document has already reset window.dataLayer and the pushed event is
// gone. This mirrors the click synchronously and returns the resulting
// dataLayer before the browser processes the navigation.
async function clickAndCaptureDataLayer(page, selector) {
  return page.evaluate((sel) => {
    document.querySelector(sel).click();
    return (window.dataLayer || []).slice();
  }, selector);
}

function findGaEvent(dataLayer, eventName) {
  const matches = dataLayer.filter((entry) => entry && entry[0] === "event" && entry[1] === eventName);
  return matches.length > 0 ? matches[matches.length - 1] : null;
}

test("select_item GA4 event fires when clicking an item card on /items/", async ({ page }) => {
  await page.goto("/items/");
  const dataLayer = await clickAndCaptureDataLayer(page, '.items-entry a[data-ga-event="select_item"][href="./ukiyoe-001/"]');
  const event = findGaEvent(dataLayer, "select_item");
  expect(event).not.toBeNull();
  expect(event[2]).toMatchObject({ item_id: "ukiyoe-001" });
  await page.waitForURL(/\/items\/ukiyoe-001\/$/);
});

test("click_related_content GA4 event fires from an item detail related link", async ({ page }) => {
  await page.goto("/items/ukiyoe-002/");
  const dataLayer = await clickAndCaptureDataLayer(page, 'a[data-ga-event="click_related_content"][href="../ukiyoe-003/"]');
  const event = findGaEvent(dataLayer, "click_related_content");
  expect(event).not.toBeNull();
  await page.waitForURL(/\/items\/ukiyoe-003\/$/);
});

test("click_contact GA4 event fires from an item detail contact link", async ({ page }) => {
  await page.goto("/items/ukiyoe-001/");
  const dataLayer = await clickAndCaptureDataLayer(page, 'a[data-ga-event="click_contact"]');
  const event = findGaEvent(dataLayer, "click_contact");
  expect(event).not.toBeNull();
  await page.waitForURL(/\/contact\/$/);
  expect(event[2]).toMatchObject({ item_id: "ukiyoe-001" });
});

test("click_instagram GA4 event fires from the footer Instagram link", async ({ page, context }) => {
  await page.goto("/");
  const instagramLink = page.locator('a[data-ga-event="click_instagram"]');
  await expect(instagramLink).toHaveAttribute("href", "https://www.instagram.com/togitsugisha/");
  await expect(instagramLink).toHaveAttribute("target", "_blank");
  await expect(instagramLink).toHaveAttribute("rel", "noopener noreferrer");

  const [popup] = await Promise.all([
    context.waitForEvent("page"),
    instagramLink.click(),
  ]);
  await popup.close();

  const event = await lastGaEvent(page, "click_instagram");
  expect(event).not.toBeNull();
});

test("items list shows a matching article teaser for ukiyoe-002 and ukiyoe-003 but not ukiyoe-001", async ({ page }) => {
  await page.goto("/items/");
  const tsushimaTeaser = page.locator('a.items-entry__related[href="../news/hiroshige-tsushima-kaigan-yubare/"]');
  const awaTeaser = page.locator('a.items-entry__related[href="../news/hiroshige-awa-kominato-uchiura/"]');
  await expect(tsushimaTeaser).toHaveCount(1);
  await expect(awaTeaser).toHaveCount(1);
  await expect(page.locator(".items-entry", { hasText: "浮世絵 三枚続　相撲場面（額装）" }).locator(".items-entry__related")).toHaveCount(0);
});

test("news list shows a matching item teaser for each article", async ({ page }) => {
  await page.goto("/news/");
  await expect(page.locator('a.news-entry__related[href="../items/ukiyoe-002/"]')).toHaveCount(1);
  await expect(page.locator('a.news-entry__related[href="../items/ukiyoe-003/"]')).toHaveCount(1);
  await expect(page.locator('a.news-entry__related[href="../items/"]')).toHaveCount(1);
});

test("article pages show a visible related-pages label", async ({ page }) => {
  for (const path of [
    "/news/hiroshige-rokuju-yoshu-meisho-zue/",
    "/news/hiroshige-tsushima-kaigan-yubare/",
    "/news/hiroshige-awa-kominato-uchiura/",
  ]) {
    await page.goto(path);
    await expect(page.locator(".article-page__related-label")).toHaveText("関連ページ");
    await expect(page.locator(".article-page__related-label")).toBeVisible();
  }
});

test("Instagram footer link is present with correct attributes on representative pages", async ({ page }) => {
  for (const path of ["/", "/items/ukiyoe-001/", "/news/hiroshige-rokuju-yoshu-meisho-zue/", "/contact/"]) {
    await page.goto(path);
    const link = page.locator('footer a[data-ga-event="click_instagram"]');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute("href", "https://www.instagram.com/togitsugisha/");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }
});
