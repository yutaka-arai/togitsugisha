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

// Reused from tests/items.spec.js's unpublishedTerms so a new item's
// description/status can be scanned for the same not-yet-listed categories.
const unpublishedTerms = ["時計", "腕時計", "置時計", "掛時計", "陶磁器", "家具", "その他古物", "古布", "Coming Soon", "仮価格", "仮在庫", "dummy"];

test.describe("item publishing: data/items.json integrity", () => {
  test("item ids and hrefs are unique", () => {
    const ids = items.map((item) => item.id);
    const hrefs = items.map((item) => item.href);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  test("every item has all required non-empty fields and a well-formed href", () => {
    const requiredFields = ["id", "category", "name", "status", "description", "thumb", "thumbAlt", "href"];
    for (const item of items) {
      for (const field of requiredFields) {
        expect(item[field], `${item.id || "(no id)"}.${field}`).toBeTruthy();
      }
      expect(item.href).toBe(`./${item.id}/`);
    }
  });

  test("every item's thumb file exists on disk", () => {
    for (const item of items) {
      // thumb paths are written relative to items/index.html (one level
      // below the repo root), e.g. "../assets/images/items/<id>-thumb.webp".
      const thumbPath = path.join(__dirname, "..", item.thumb.replace(/^\.\.\//, ""));
      expect(fs.existsSync(thumbPath), item.thumb).toBe(true);
    }
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
      expect(ogImageResponse.headers()["content-type"]).toMatch(/^image\//);

      const figureMatch = html.match(/<figure class="item-detail__figure">([\s\S]*?)<\/figure>/);
      expect(figureMatch).not.toBeNull();
      const mainImageMatch = figureMatch[1].match(/<img\s+src="([^"]+)"[\s\S]*?alt="([^"]*)"/);
      expect(mainImageMatch).not.toBeNull();
      expect(mainImageMatch[2].trim()).not.toBe("");
      const mainImagePath = new URL(mainImageMatch[1], `http://local${detailPath}`).pathname;
      const mainImageResponse = await request.get(mainImagePath);
      expect(mainImageResponse.status()).toBe(200);
      expect(mainImageResponse.headers()["content-type"]).toMatch(/^image\//);

      expect(html).toContain('src="https://www.googletagmanager.com/gtag/js?id=G-M1T6XY1PRM"');
      expect(html).toContain("gtag('config', 'G-M1T6XY1PRM')");
      expect(html).toMatch(/<script src="[^"]*assets\/js\/main\.js"><\/script>/);

      const instagramMatch = html.match(/<a\s+href="https:\/\/www\.instagram\.com\/togitsugisha\/"([^>]*)>/);
      expect(instagramMatch).not.toBeNull();
      expect(instagramMatch[1]).toContain('target="_blank"');
      expect(instagramMatch[1]).toContain('rel="noopener noreferrer"');
      expect(instagramMatch[1]).toContain('data-ga-event="click_instagram"');

      expect(html).toContain(`data-ga-event="click_contact" data-ga-item-id="${item.id}"`);
      expect(html).toContain('class="item-detail__backlink" href="../"');

      // A related-content block is optional (an item with no genuinely
      // related article must not carry a fabricated link), but any link
      // that IS present there must carry click_related_content + the
      // item's own id.
      const relatedUlMatch = html.match(/<ul class="item-detail__links">([\s\S]*?)<\/ul>/);
      if (relatedUlMatch) {
        const relatedLinks = [...relatedUlMatch[1].matchAll(/<a\s+href="([^"]+)"([^>]*)>/g)];
        for (const [, href, attrs] of relatedLinks) {
          if (href === "../") continue; // "back to list" link, not a related-content link
          expect(attrs, href).toContain('data-ga-event="click_related_content"');
          expect(attrs, href).toContain(`data-ga-item-id="${item.id}"`);
        }
      }

      for (const term of unpublishedTerms) {
        expect(html, term).not.toContain(term);
      }
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

  async function selectItemPairs(pageOrNoJsPage, scopeSelector) {
    return pageOrNoJsPage.evaluate((scope) => {
      return [...document.querySelectorAll(`${scope} a[data-ga-event="select_item"]`)].map(
        (a) => `${a.getAttribute("href")}|${a.getAttribute("data-ga-item-id")}`
      );
    }, scopeSelector);
  }

  test("/items/ card count and select_item set match items.length with JavaScript disabled and enabled", async ({ page, browser }) => {
    const noJsContext = await browser.newContext({ javaScriptEnabled: false });
    const noJsPage = await noJsContext.newPage();
    await noJsPage.goto("http://127.0.0.1:4174/items/");
    await expect(noJsPage.locator(".items-entry")).toHaveCount(items.length);
    const noJsPairs = await selectItemPairs(noJsPage, ".items-entry");
    await noJsContext.close();

    const itemsResponse = page.waitForResponse(
      (response) => response.url().endsWith("/data/items.json") && response.ok()
    );
    await page.goto("/items/");
    await itemsResponse;
    await expect(page.locator("#items-status")).toHaveAttribute("data-items-render-state", "loaded");
    await expect(page.locator(".items-entry")).toHaveCount(items.length);
    const jsPairs = await selectItemPairs(page, ".items-entry");

    expect(new Set(noJsPairs)).toEqual(new Set(jsPairs));
  });

  test("home page card count matches the first min(4, items.length) with JavaScript disabled and enabled", async ({ page, browser }) => {
    const expectedIds = new Set(items.slice(0, 4).map((item) => item.id));

    const noJsContext = await browser.newContext({ javaScriptEnabled: false });
    const noJsPage = await noJsContext.newPage();
    await noJsPage.goto("http://127.0.0.1:4174/");
    await expect(noJsPage.locator("#item-grid .items-entry")).toHaveCount(expectedIds.size);
    const noJsIds = await noJsPage.evaluate(() =>
      [...document.querySelectorAll('#item-grid a[data-ga-event="select_item"]')].map((a) =>
        a.getAttribute("data-ga-item-id")
      )
    );
    await noJsContext.close();
    expect(new Set(noJsIds)).toEqual(expectedIds);

    const itemsResponse = page.waitForResponse(
      (response) => response.url().endsWith("/data/items.json") && response.ok()
    );
    await page.goto("/");
    await itemsResponse;
    await expect(page.locator("#item-grid")).toHaveAttribute("data-items-render-state", "loaded");
    await expect(page.locator("#item-grid .items-entry")).toHaveCount(expectedIds.size);
    const jsIds = await page.evaluate(() =>
      [...document.querySelectorAll('#item-grid a[data-ga-event="select_item"]')].map((a) =>
        a.getAttribute("data-ga-item-id")
      )
    );
    expect(new Set(jsIds)).toEqual(expectedIds);
  });
});
