const { expect, test } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

// Data-driven checks for the "new item was published correctly" contract.
// These read data/items.json directly instead of hardcoding item ids, so a
// future real item is covered automatically without editing this file.
const items = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "items.json"), "utf8")
);
const sitemapXml = fs.readFileSync(path.join(__dirname, "..", "sitemap.xml"), "utf8");
const itemsIndexHtml = fs.readFileSync(path.join(__dirname, "..", "items", "index.html"), "utf8");
const homeIndexHtml = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

function toLocalPath(absoluteUrl) {
  // A not-yet-deployed item is never live on togitsugisha.com, and hitting
  // instagram.com from a test is out of scope, so absolute production URLs
  // found in markup are converted to a local request path instead.
  return absoluteUrl.replace(/^https:\/\/togitsugisha\.com/, "");
}

test.describe("item publishing: data/items.json integrity", () => {
  test("item ids and hrefs are unique", () => {
    const ids = items.map((item) => item.id);
    const hrefs = items.map((item) => item.href);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

test.describe("item publishing: per-item detail page checks", () => {
  for (const item of items) {
    test(`${item.id}: detail page carries required SEO/GA4/analytics wiring`, async ({ request }) => {
      const detailPath = `/items/${item.id}/`;
      const response = await request.get(detailPath);
      expect(response.status()).toBe(200);
      const html = await response.text();

      expect(html).toMatch(/<title>[^<]+\| 時継舎<\/title>/);
      expect(html).toMatch(/<h1[^>]*>[^<]+<\/h1>/);
      expect(html.toLowerCase()).not.toContain("noindex");

      const canonicalUrl = `https://togitsugisha.com/items/${item.id}/`;
      expect(html).toContain(`<link rel="canonical" href="${canonicalUrl}">`);
      expect(html).toContain(`<meta property="og:url" content="${canonicalUrl}">`);
      expect(html).toMatch(/<meta\s+name="description"[^>]*content="[^"]+"/);
      expect(html).toMatch(/<meta property="og:title" content="[^"]+ \| 時継舎">/);
      expect(html).toMatch(/<meta property="og:description" content="[^"]+">/);

      const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)">/);
      expect(ogImageMatch).not.toBeNull();
      const ogImageResponse = await request.get(toLocalPath(ogImageMatch[1]));
      expect(ogImageResponse.status()).toBe(200);

      const mainImageMatch = html.match(/<figure class="item-detail__figure">[\s\S]*?<img\s+src="([^"]+)"/);
      expect(mainImageMatch).not.toBeNull();
      const mainImagePath = new URL(mainImageMatch[1], `http://local${detailPath}`).pathname;
      const mainImageResponse = await request.get(mainImagePath);
      expect(mainImageResponse.status()).toBe(200);

      expect(html).toContain('src="https://www.googletagmanager.com/gtag/js?id=G-M1T6XY1PRM"');
      expect(html).toContain("gtag('config', 'G-M1T6XY1PRM')");
      expect(html).toMatch(/<script src="[^"]*assets\/js\/main\.js"><\/script>/);

      expect(html).toMatch(/<a\s+href="https:\/\/www\.instagram\.com\/togitsugisha\/"[^>]*data-ga-event="click_instagram"[^>]*>/);
      expect(html).toContain(`data-ga-event="click_contact" data-ga-item-id="${item.id}"`);
      expect(html).toContain('class="item-detail__backlink" href="../"');
    });
  }
});

test.describe("item publishing: list page and sitemap coverage", () => {
  test("sitemap.xml lists every item detail page", () => {
    for (const item of items) {
      expect(sitemapXml).toContain(`<loc>https://togitsugisha.com/items/${item.id}/</loc>`);
    }
  });

  test("static /items/ HTML shows the correct listed count and a select_item card per item", () => {
    expect(itemsIndexHtml).toContain(`掲載中の品は${items.length}点です`);
    expect(itemsIndexHtml).toContain(`<p>${items.length}件</p>`);
    for (const item of items) {
      expect(itemsIndexHtml).toContain(`data-ga-event="select_item" data-ga-item-id="${item.id}"`);
    }
  });

  test("home page static cards show the first min(4, items.length) items and no others", () => {
    const expectedIds = items.slice(0, 4).map((item) => item.id);
    for (const id of expectedIds) {
      expect(homeIndexHtml).toContain(`data-ga-item-id="${id}"`);
    }
    const idsInHome = [...homeIndexHtml.matchAll(/data-ga-item-id="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(idsInHome)).toEqual(new Set(expectedIds));
  });

  test("static /items/ markup and JS-rendered markup both expose select_item for every item", async ({ page, request }) => {
    const rawResponse = await request.get("/items/");
    const rawHtml = await rawResponse.text();

    const itemsResponse = page.waitForResponse(
      (response) => response.url().endsWith("/data/items.json") && response.ok()
    );
    await page.goto("/items/");
    await itemsResponse;
    await expect(page.locator("#items-status")).toHaveAttribute("data-items-render-state", "loaded");

    for (const item of items) {
      expect(rawHtml).toContain(`data-ga-event="select_item" data-ga-item-id="${item.id}"`);
      const renderedCount = await page
        .locator(`.items-entry a[data-ga-event="select_item"][data-ga-item-id="${item.id}"]`)
        .count();
      expect(renderedCount).toBeGreaterThan(0);
    }
  });
});
