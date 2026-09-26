const { expect, test } = require("@playwright/test");

const articlePath = "/news/hiroshige-tsushima-kaigan-yubare/";
const articleUrl = "https://togitsugisha.com/news/hiroshige-tsushima-kaigan-yubare/";
const articleTitle = "歌川広重《六十余州名所図会 対馬 海岸夕晴》を読む｜時継舎";
const articleDescription = "歌川広重「六十余州名所図会」の一図《対馬 海岸夕晴》を紹介。対馬の海を描いた画面を見ながら、シリーズの成り立ちや作品の見どころをたどります。";
const h1Text = "歌川広重《六十余州名所図会 対馬 海岸夕晴》を読む ――海と空が広がる対馬の風景";

const awaArticlePath = "/news/hiroshige-awa-kominato-uchiura/";
const awaArticleUrl = "https://togitsugisha.com/news/hiroshige-awa-kominato-uchiura/";
const awaArticleTitle = "歌川広重《六十余州名所図会 安房 小湊内浦》を読む｜時継舎";
const awaArticleDescription = "歌川広重「六十余州名所図会」の一図《安房 小湊内浦》を紹介。現在の千葉県鴨川市にあたる内浦海岸の景観を通して、作品とシリーズの背景をたどります。";
const awaH1Text = "歌川広重《六十余州名所図会 安房 小湊内浦》を読む ――海を望む安房・小湊の風景";

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
  const pagePath = new URL(page.url()).pathname;
  const localHrefs = await page.locator("a[href]").evaluateAll((links) =>
    [...new Set(links
      .map((link) => link.getAttribute("href"))
      .filter((href) => href && !href.startsWith("http") && !href.startsWith("mailto:") && !href.startsWith("#")))]
  );

  for (const href of localHrefs) {
    const response = await request.get(new URL(href, `http://127.0.0.1:4174${pagePath}`).pathname);
    expect(response.status(), href).toBeLessThan(400);
  }

  const imageSrcs = await page.locator("img[src]").evaluateAll((images) =>
    [...new Set(images.map((image) => image.getAttribute("src")).filter(Boolean))]
  );

  for (const src of imageSrcs) {
    const response = await request.get(new URL(src, `http://127.0.0.1:4174${pagePath}`).pathname);
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

test("Hiroshige Awa article exposes SEO metadata and internal links", async ({ page, request }) => {
  const errors = collectBrowserErrors(page);

  const response = await page.goto(awaArticlePath);
  expect(response.status()).toBe(200);

  await expect(page).toHaveTitle(awaArticleTitle);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", awaArticleDescription);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", awaArticleUrl);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "article");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", awaArticleTitle);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", awaArticleDescription);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", awaArticleUrl);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", "https://togitsugisha.com/assets/images/items/ukiyoe-003-main.webp");
  await expect(page.getByRole("heading", { name: awaH1Text })).toBeVisible();
  await expect(page.getByText("江戸時代を代表する浮世絵師、歌川広重。")).toBeVisible();

  await expect(page.getByRole("link", { name: "時継舎掲載作品「六十余州名所図会 安房 小湊内浦」を見る" }).first()).toHaveAttribute("href", "../../items/ukiyoe-003/");
  await expect(page.getByRole("link", { name: "《対馬 海岸夕晴》の解説記事を読む" }).first()).toHaveAttribute("href", "../hiroshige-tsushima-kaigan-yubare/");
  await expect(page.getByRole("link", { name: "文化遺産オンライン「版画『六十余州名所図会 安房 小湊内浦』」" })).toHaveAttribute("href", "https://online.bunka.go.jp/index.php/heritages/detail/359724");
  await expect(page.getByRole("link", { name: "アートプラットフォームジャパン「六十余州名所図会 安房 小湊内浦」" })).toHaveAttribute("href", "https://artplatform.go.jp/ja/collections/W282439");
  await expect(page.getByRole("link", { name: "静岡市東海道広重美術館 出品目録" })).toHaveAttribute("href", "https://tokaido-hiroshige.jp/assets/docs/exhibition/2023_1st_exhibition_list_jp.pdf");
  await expect(page.getByRole("link", { name: "鴨川市 文化財保存活用地域計画" })).toHaveAttribute("href", "https://www.city.kamogawa.lg.jp/uploaded/attachment/21994.pdf");

  await expectLocalLinksAndImagesOk(page, request);
  expect(errors).toEqual([]);
});

test("news list and sitemap include the article once", async ({ page, request }) => {
  const errors = collectBrowserErrors(page);

  await page.goto("/news/");
  await expect(page.getByRole("link", { name: "歌川広重《六十余州名所図会 対馬 海岸夕晴》を読む" })).toHaveCount(1);
  await expect(page.getByRole("link", { name: "歌川広重《六十余州名所図会 安房 小湊内浦》を読む" })).toHaveCount(1);
  await expect(page.getByRole("link", { name: /記事を読む/ })).toHaveCount(2);
  await expect(page.locator('.news-entry', { hasText: "歌川広重《六十余州名所図会 対馬 海岸夕晴》を読む" }).getByRole("link", { name: /記事を読む/ })).toHaveAttribute("href", "./hiroshige-tsushima-kaigan-yubare/");
  await expect(page.locator('.news-entry', { hasText: "歌川広重《六十余州名所図会 安房 小湊内浦》を読む" }).getByRole("link", { name: /記事を読む/ })).toHaveAttribute("href", "./hiroshige-awa-kominato-uchiura/");
  expect(errors).toEqual([]);

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const sitemapText = await sitemap.text();
  expect(sitemapText.match(new RegExp(articleUrl, "g"))).toHaveLength(1);
  expect(sitemapText.match(new RegExp(awaArticleUrl, "g"))).toHaveLength(1);
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

test("Awa article page holds up on desktop and 390px mobile without horizontal overflow", async ({ page }) => {
  const errors = collectBrowserErrors(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(awaArticlePath);
  await expect(page.getByRole("heading", { name: awaH1Text })).toBeVisible();
  await expect(page.locator(".article-page__figure img")).toBeVisible();
  await page.screenshot({ path: "test-results/article-hiroshige-awa-desktop.png", fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(awaArticlePath);
  await expect(page.getByRole("heading", { name: awaH1Text })).toBeVisible();
  const box = await page.locator(".article-page__figure img").boundingBox();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(391);
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(horizontalOverflow).toBe(false);
  await page.screenshot({ path: "test-results/article-hiroshige-awa-mobile.png", fullPage: true });

  expect(errors).toEqual([]);
});

test("existing item pages remain reachable", async ({ request }) => {
  for (const path of ["/items/ukiyoe-001/", "/items/ukiyoe-002/", "/items/ukiyoe-003/", articlePath, awaArticlePath]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
  }
});
