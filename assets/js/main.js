const waitingNews = [
  {
    text: "ただいまホームページを準備しています。"
  }
];

// Maps an item id to its matching article, for a list-level "read the
// article" teaser. Only items with a genuinely related, already-published
// article are listed here (ukiyoe-001 has no matching article and is
// intentionally omitted).
const ITEM_RELATED_ARTICLE = {
  "ukiyoe-002": {
    href: "../news/hiroshige-tsushima-kaigan-yubare/",
    label: "対馬 海岸夕晴の記事を読む"
  },
  "ukiyoe-003": {
    href: "../news/hiroshige-awa-kominato-uchiura/",
    label: "安房 小湊内浦の記事を読む"
  }
};

// Maps a news entry's href (as used in data/news.json) to its matching
// item/list destination, for a list-level "see the item" teaser.
const NEWS_RELATED_ITEM = {
  "./hiroshige-tsushima-kaigan-yubare/": {
    href: "../items/ukiyoe-002/",
    label: "対馬 海岸夕晴の品を見る"
  },
  "./hiroshige-awa-kominato-uchiura/": {
    href: "../items/ukiyoe-003/",
    label: "安房 小湊内浦の品を見る"
  },
  "./hiroshige-rokuju-yoshu-meisho-zue/": {
    href: "../items/",
    label: "掲載中の品を見る"
  }
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderHomeWaitingItems() {
  const container = document.getElementById("item-grid");
  if (!container) return;

  container.dataset.itemsRenderState = "waiting";
  container.innerHTML = `
    <div class="items-placeholder__copy">
      <p class="items-placeholder__status">準備中</p>
      <p class="items-placeholder__lead">掲載内容を確認しています。</p>
      <p class="items-placeholder__text">掲載済みの写真と詳細が整った品のみ、順次ご案内します。</p>
    </div>
  `;
}

function renderHomeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    renderHomeWaitingItems();
    return;
  }

  const container = document.getElementById("item-grid");
  if (!container) return;

  container.dataset.itemsRenderState = "loaded";
  container.innerHTML = items
    .slice(0, 4)
    .map((item) => {
      const title = escapeHtml(item.name || "掲載予定の品");
      const description = escapeHtml(item.description || "詳細は順次公開予定です。");
      const href = item.href ? `items/${String(item.href).replace(/^\.\//, "")}` : "./items/";
      const thumb = item.thumb ? String(item.thumb).replace(/^\.\.\//, "") : "";
      const itemId = escapeHtml(item.id || "");
      const image = thumb
        ? `<a class="items-entry__thumb" href="${escapeHtml(href)}" data-ga-event="select_item" data-ga-item-id="${itemId}"><img src="${escapeHtml(thumb)}" alt="${escapeHtml(item.thumbAlt || item.name || "商品写真")}" loading="lazy" decoding="async"></a>`
        : "";
      const more = `<a class="items-entry__more" href="${escapeHtml(href)}" data-ga-event="select_item" data-ga-item-id="${itemId}">詳しく見る<span aria-hidden="true">→</span></a>`;
      return `
        <article class="items-entry">
          ${image}
          <span class="items-entry__status">${escapeHtml(item.status || "掲載中")}</span>
          <h3><a href="${escapeHtml(href)}" data-ga-event="select_item" data-ga-item-id="${itemId}">${title}</a></h3>
          <p class="items-entry__description">${description}</p>
          ${more}
        </article>
      `;
    })
    .join("");
}

function formatDisplayDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function renderNews(items, renderState = "loaded") {
  const container = document.getElementById("news-list");
  if (!container) return;

  container.dataset.newsRenderState = renderState;
  const source = Array.isArray(items) && items.length > 0 ? items : waitingNews;
  container.innerHTML = source
    .slice(0, 3)
    .map((entry) => {
      const text = escapeHtml(entry.text || entry.title || "ただいまホームページを準備しています。");
      const displayDate = formatDisplayDate(entry.date);
      const href = entry.href ? escapeHtml(entry.href) : "";
      const body = href ? `<a href="news/${href.replace(/^\.\//, "")}">${text}</a>` : text;
      return `
        <li class="news-list__item${entry.date ? "" : " news-list__item--waiting"}">
          ${entry.date ? `<time datetime="${escapeHtml(entry.date)}">${displayDate}</time>` : ""}
          <p>${body}</p>
        </li>
      `;
    })
    .join("");
}

function renderNewsPageEmpty(message) {
  const status = document.getElementById("news-status");
  const list = document.getElementById("news-page-list");
  if (!status || !list) return;

  status.innerHTML = `
    <p class="news-page__status-title">${escapeHtml(message.title)}</p>
    <p class="news-page__status-text">${escapeHtml(message.text)}</p>
  `;

  list.innerHTML = `
    <article class="news-entry news-entry--empty">
      <div class="news-entry__body">
        <h3>${escapeHtml(message.title)}</h3>
        <p>${escapeHtml(message.text)}</p>
      </div>
    </article>
  `;
}

function renderNewsPage(items) {
  const status = document.getElementById("news-status");
  const list = document.getElementById("news-page-list");
  if (!status || !list) return;

  if (!Array.isArray(items) || items.length === 0) {
    renderNewsPageEmpty({
      title: "現在、お知らせはありません。",
      text: "新しいお知らせがありましたら、こちらでご案内いたします。"
    });
    return;
  }

  status.innerHTML = `
    <p class="news-page__status-title">新しいご案内を掲載しています。</p>
    <p class="news-page__status-text">更新がありましたら、日付とあわせてこちらへ掲載します。</p>
  `;

  list.innerHTML = items
    .map((entry) => {
      const date = entry.date ? `<time class="news-entry__date" datetime="${escapeHtml(entry.date)}">${formatDisplayDate(entry.date)}</time>` : "";
      const category = entry.category ? `<span class="news-entry__category">${escapeHtml(entry.category)}</span>` : "";
      const title = escapeHtml(entry.title || "お知らせ");
      const body = escapeHtml(entry.body || entry.text || "詳細は順次ご案内いたします。");
      const href = entry.href ? escapeHtml(entry.href) : "";
      const heading = href ? `<a href="${href}">${title}</a>` : title;
      const more = href ? `<a class="news-entry__more" href="${href}">記事を読む<span aria-hidden="true">→</span></a>` : "";
      const relatedItem = entry.href ? NEWS_RELATED_ITEM[entry.href] : null;
      const relatedLink = relatedItem
        ? `<a class="news-entry__related" href="${escapeHtml(relatedItem.href)}" data-ga-event="click_related_content">${escapeHtml(relatedItem.label)}</a>`
        : "";
      return `
        <article class="news-entry">
          <div class="news-entry__meta">
            ${date}
            ${category}
          </div>
          <div class="news-entry__body">
            <h3>${heading}</h3>
            <p>${body}</p>
            ${more}
            ${relatedLink}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderItemsPageWaiting(message) {
  const status = document.getElementById("items-status");
  const catalog = document.getElementById("items-catalog");
  if (!status || !catalog) return;

  status.innerHTML = `
    <div class="items-status__copy">
      <p class="items-status__title">${escapeHtml(message.title)}</p>
      <p class="items-status__lead">${escapeHtml(message.lead)}</p>
      ${message.text ? `<p class="items-status__text">${escapeHtml(message.text)}</p>` : ""}
    </div>
  `;

  catalog.innerHTML = `
    <section class="items-group" id="listed-items" aria-labelledby="listed-items-title">
      <div class="items-group__heading">
        <h3 id="listed-items-title">掲載中の品</h3>
        <p>確認中</p>
      </div>
      <div class="items-group__copy">
        <p class="is-strong">掲載済みの品を確認しています</p>
        <p>実際の写真と詳細が確認できた内容のみ表示します。</p>
      </div>
    </section>
  `;
}

function renderItemsPage(items) {
  const status = document.getElementById("items-status");
  const catalog = document.getElementById("items-catalog");
  if (!status || !catalog) return;

  if (!Array.isArray(items) || items.length === 0) {
    renderItemsPageWaiting({
      title: "品物はただいま準備中です",
      lead: "写真と詳細は順次掲載いたします。",
      text: "掲載前の品についても、確認できた内容から順にご紹介します。"
    });
    return;
  }

  status.innerHTML = `
    <div class="items-status__copy">
      <p class="items-status__title">掲載中の品は${items.length}点です</p>
      <p class="items-status__lead">実物写真と詳細ページがある品のみを一覧にしています。</p>
    </div>
  `;
  status.dataset.itemsRenderState = "loaded";

  catalog.innerHTML = `
    <section class="items-group" id="listed-items" aria-labelledby="listed-items-title">
      <div class="items-group__heading">
        <h3 id="listed-items-title">掲載中の品</h3>
        <p>${items.length}件</p>
      </div>
      <div class="items-card-grid">
        ${items.map((item) => {
          const title = escapeHtml(item.name || "名称確認中");
          const description = escapeHtml(item.description || "確認できた内容を掲載しています。");
          const statusText = escapeHtml(item.status || "掲載中");
          const itemId = escapeHtml(item.id || "");
          const thumb = item.thumb
            ? `<a class="items-entry__thumb" href="${escapeHtml(item.href || "#")}" data-ga-event="select_item" data-ga-item-id="${itemId}"><img src="${escapeHtml(item.thumb)}" alt="${escapeHtml(item.thumbAlt || item.name || "商品写真")}" loading="eager" decoding="async"></a>`
            : "";
          const more = item.href
            ? `<a class="items-entry__more" href="${escapeHtml(item.href)}" data-ga-event="select_item" data-ga-item-id="${itemId}">詳しく見る<span aria-hidden="true">→</span></a>`
            : "";
          const relatedArticle = ITEM_RELATED_ARTICLE[item.id];
          const relatedLink = relatedArticle
            ? `<a class="items-entry__related" href="${escapeHtml(relatedArticle.href)}" data-ga-event="click_related_content" data-ga-item-id="${itemId}">${escapeHtml(relatedArticle.label)}</a>`
            : "";
          return `
            <article class="items-entry">
              ${thumb}
              <span class="items-entry__status">${statusText}</span>
              <h4>${item.href ? `<a href="${escapeHtml(item.href)}" data-ga-event="select_item" data-ga-item-id="${itemId}">${title}</a>` : title}</h4>
              <p class="items-entry__description">${description}</p>
              ${more}
              ${relatedLink}
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

async function readJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }
  return response.json();
}

async function bootstrapHomePage() {
  const itemsPromise = readJson("data/items.json")
    .then((items) => {
      renderHomeItems(items);
    })
    .catch((error) => {
      // Keep the server-rendered static item cards visible on fetch failure.
      const container = document.getElementById("item-grid");
      if (container) {
        container.dataset.itemsRenderState = "fallback";
      }
      console.warn("Item data could not be loaded. Keeping the static home item list as-is.", error);
    });

  const newsPromise = readJson("data/news.json")
    .then((news) => {
      renderNews(news);
    })
    .catch((error) => {
      console.warn("News data could not be loaded. Waiting-state content is used.", error);
      renderNews(waitingNews, "fallback");
    });

  await Promise.all([itemsPromise, newsPromise]);
}

function getItemsDataPath() {
  const url = new URL(window.location.href);
  return url.searchParams.get("itemsDataPath") || "../data/items.json";
}

async function bootstrapItemsPage() {
  try {
    const items = await readJson(getItemsDataPath());
    renderItemsPage(items);
  } catch (error) {
    // Keep the server-rendered static item cards visible on fetch failure
    // instead of replacing them with a waiting-state placeholder.
    console.warn("Item data could not be loaded. Keeping the static item list as-is.", error);
  }
}

function getNewsDataPath() {
  const url = new URL(window.location.href);
  return url.searchParams.get("newsDataPath") || "../data/news.json";
}

async function bootstrapNewsPage() {
  try {
    const news = await readJson(getNewsDataPath());
    renderNewsPage(news);
  } catch {
    renderNewsPageEmpty({
      title: "お知らせの情報を準備しています。",
      text: "しばらくしてからご覧ください。"
    });
  }
}

function bootstrap() {
  const page = document.body.dataset.page;
  if (page === "home") {
    bootstrapHomePage();
    return;
  }
  if (page === "items") {
    bootstrapItemsPage();
    return;
  }
  if (page === "news") {
    bootstrapNewsPage();
  }
}

// Delegated GA4 click tracking: any element with data-ga-event="<name>" fires
// gtag('event', <name>, params) on click. Additional data-ga-<key> attributes
// become event params (data-ga-item-id -> item_id). Works for both
// server-rendered and JS-rendered content since it listens on document.
function initAnalyticsEvents() {
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-ga-event]");
    if (!trigger) return;

    const eventName = trigger.getAttribute("data-ga-event");
    if (!eventName || typeof gtag !== "function") return;

    const params = {};
    for (const attr of trigger.attributes) {
      if (attr.name === "data-ga-event" || !attr.name.startsWith("data-ga-")) continue;
      const key = attr.name.slice("data-ga-".length).replace(/-/g, "_");
      params[key] = attr.value;
    }

    gtag("event", eventName, params);
  });
}

bootstrap();
initAnalyticsEvents();
