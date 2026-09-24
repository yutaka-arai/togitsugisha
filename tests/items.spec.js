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
const newItems = [
  {
    title: "歌川広重 六十余州名所図会 対馬 海岸夕晴",
    path: "/items/ukiyoe-002/",
    canonical: "https://togitsugisha.com/items/ukiyoe-002/",
    image: "/assets/images/items/ukiyoe-002-main.webp",
    ogImage: "https://togitsugisha.com/assets/images/items/ukiyoe-002-main.webp",
  },
  {
    title: "歌川広重 六十余州名所図会 安房 小湊内浦",
    path: "/items/ukiyoe-003/",
    canonical: "https://togitsugisha.com/items/ukiyoe-003/",
    image: "/assets/images/items/ukiyoe-003-main.webp",
    ogImage: "https://togitsugisha.com/assets/images/items/ukiyoe-003-main.webp",
  },
];

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

test("new ukiyoe items appear in list and expose detail metadata", async ({ page, request }) => {
  const errors = collectBrowserErrors(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/items/");

  for (const item of newItems) {
    const card = page.locator(".items-entry", { hasText: item.title });
    await expect(card).toBeVisible();
    await expect(card.locator("img")).toBeVisible();

    const imageResponse = await request.get(item.image);
    expect(imageResponse.status()).toBe(200);

    await card.getByRole("link", { name: /詳しく見る/ }).click();
    await expect(page).toHaveURL(new RegExp(`${item.path}$`));
    await expect(page.getByRole("heading", { name: item.title })).toBeVisible();
    await expect(page.getByText("真作・初摺・江戸期オリジナル・後摺・復刻版等の別については、現在断定していません。")).toBeVisible();
    await expect(page.getByRole("link", { name: /お問い合わせへ/ })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", item.canonical);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", item.canonical);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", `${item.title} | 時継舎`);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", item.ogImage);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");

    const detailImageResponse = await request.get(item.image);
    expect(detailImageResponse.status()).toBe(200);

    await page.goto("/items/");
  }

  await page.screenshot({ path: "test-results/items-new-list-desktop.png", fullPage: true });
  expect(errors).toEqual([]);
});

for (const item of newItems) {
  test(`${item.title} detail page holds up at 390px`, async ({ page, request }) => {
    const errors = collectBrowserErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(item.path);

    await expect(page.getByRole("heading", { name: item.title })).toBeVisible();
    await expect(page.locator(".subhero__lead")).toContainText("「六十余州名所図会」シリーズの一図です。");

    const image = page.locator(".item-detail__figure img");
    await expect(image).toBeVisible();
    const box = await image.boundingBox();
    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390 + 1);

    const imageResponse = await request.get(item.image);
    expect(imageResponse.status()).toBe(200);

    await page.screenshot({ path: `test-results/${item.path.split("/").filter(Boolean).pop()}-mobile.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}
