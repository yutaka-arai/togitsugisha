const { expect, test } = require("@playwright/test");

const articlePath = "/news/hiroshige-tsushima-kaigan-yubare/";
const articleUrl = "https://togitsugisha.com/news/hiroshige-tsushima-kaigan-yubare/";
const articleTitle = "歌川広重《六十余州名所図会 対馬 海岸夕晴》を読む｜時継舎";
const articleDescription = "歌川広重「六十余州名所図会」の一図《対馬 海岸夕晴》を紹介。対馬の海を描いた画面を見ながら、シリーズの成り立ちや作品の見どころをたどります。";
const h1Text = "歌川広重《六十余州名所図会 対馬 海岸夕晴》を読む ――海と空が広がる対馬の風景";

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

async function expectLocalLinksAndImagesOk(page, request) {
  const localHrefs = await page.locator("a[href]").evaluateAll((links) =>
    [...new Set(links
      .map((link) => link.getAttribute("href"))
      .filter((href) => href && !href.startsWith("http") && !href.startsWith("mailto:") && !href.startsWith("#")))]
  );

  for (const href of localHrefs) {
    const response = await request.get(new URL(href, `http://127.0.0.1:4174${articlePath}`).pathname);
    expect(response.status(), href).toBeLessThan(400);
  }

  const imageSrcs = await page.locator("img[src]").evaluateAll((images) =>
    [...new Set(images.map((image) => image.getAttribute("src")).filter(Boolean))]
  );

  for (const src of imageSrcs) {
    const response = await request.get(new URL(src, `http://127.0.0.1:4174${articlePath}`).pathname);
    expect(response.status(), src).toBe(200);
  }
}

test("Hiroshige Tsushima article exposes SEO metadata and internal links", async ({ page, request }) => {
  const errors = collectBrowserErrors(page);

  const response = await page.goto(articlePath);
  expect(response.status()).toBe(200);

  await expect(page).toHaveTitle(articleTitle);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", articleDescription);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", articleUrl);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "article");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", articleTitle);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", articleDescription);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", articleUrl);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://togitsugisha.com/assets/images/items/ukiyoe-002-main.webp");
  await expect(page.getByRole("heading", { name: h1Text })).toBeVisible();

  await expect(page.getByRole("link", { name: "時継舎掲載作品『六十余州名所図会 対馬 海岸夕晴』を見る" }).first()).toHaveAttribute("href", "../../items/ukiyoe-002/");
  await expect(page.getByRole("link", { name: "時継舎掲載作品『六十余州名所図会 安房 小湊内浦』を見る" }).first()).toHaveAttribute("href", "../../items/ukiyoe-003/");
  await expect(page.getByRole("link", { name: "国立国会図書館「六十余州名所図会」" })).toHaveAttribute("href", "https://www.ndl.go.jp/landmarks/series/60meisho");
  await expect(page.getByRole("link", { name: "国立国会図書館「対馬」" })).toHaveAttribute("href", "https://www.ndl.go.jp/landmarks/sights/tsushima");
  await expect(page.getByRole("link", { name: "国立国会図書館サーチ「大日本六十餘州名勝圖會」" })).toHaveAttribute("href", "https://ndlsearch.ndl.go.jp/books/R100000002-I000007301389");

  await expectLocalLinksAndImagesOk(page, request);
  expect(errors).toEqual([]);
});

test("news list and sitemap include the article once", async ({ page, request }) => {
  const errors = collectBrowserErrors(page);

  await page.goto("/news/");
  await expect(page.getByRole("link", { name: "歌川広重《六十余州名所図会 対馬 海岸夕晴》を読む" })).toHaveCount(1);
  await expect(page.getByRole("link", { name: /記事を読む/ })).toHaveAttribute("href", "./hiroshige-tsushima-kaigan-yubare/");
  expect(errors).toEqual([]);

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain(articleUrl);
});

test("article page holds up on desktop and 390px mobile", async ({ page }) => {
  const errors = collectBrowserErrors(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(articlePath);
  await expect(page.getByRole("heading", { name: h1Text })).toBeVisible();
  await expect(page.locator(".article-page__figure img")).toBeVisible();
  await page.screenshot({ path: "test-results/article-hiroshige-tsushima-desktop.png", fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(articlePath);
  await expect(page.getByRole("heading", { name: h1Text })).toBeVisible();
  const box = await page.locator(".article-page__figure img").boundingBox();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(391);
  await page.screenshot({ path: "test-results/article-hiroshige-tsushima-mobile.png", fullPage: true });

  expect(errors).toEqual([]);
});

test("existing item pages remain reachable", async ({ request }) => {
  for (const path of ["/items/ukiyoe-001/", "/items/ukiyoe-002/", "/items/ukiyoe-003/"]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
  }
});
