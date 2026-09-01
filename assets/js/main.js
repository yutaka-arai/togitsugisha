const waitingNews = [
  {
    text: "ただいまホームページを準備しています。"
  }
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderWaitingItems() {
  const container = document.getElementById("item-grid");
  if (!container) return;

  container.innerHTML = `
    <div class="items-placeholder__copy">
      <p class="items-placeholder__status">準備中</p>
      <p class="items-placeholder__lead">近日公開予定です。</p>
      <p class="items-placeholder__text">商品の写真と詳細は、順次公開いたします。</p>
    </div>
    <div class="placeholder-grid" aria-label="古物の装飾イメージ">
      <article class="placeholder-card">
        <span class="placeholder-card__icon" aria-hidden="true">時</span>
        <h3>古時計</h3>
        <p>装飾イメージ</p>
      </article>
      <article class="placeholder-card">
        <span class="placeholder-card__icon" aria-hidden="true">湯</span>
        <h3>鉄瓶</h3>
        <p>装飾イメージ</p>
      </article>
      <article class="placeholder-card">
        <span class="placeholder-card__icon" aria-hidden="true">器</span>
        <h3>陶磁器</h3>
        <p>装飾イメージ</p>
      </article>
      <article class="placeholder-card">
        <span class="placeholder-card__icon" aria-hidden="true">布</span>
        <h3>古布</h3>
        <p>装飾イメージ</p>
      </article>
    </div>
  `;
}

function renderItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    renderWaitingItems();
    return;
  }

  const container = document.getElementById("item-grid");
  if (!container) return;

  container.innerHTML = items
    .slice(0, 4)
    .map((item) => {
      const title = escapeHtml(item.name || "掲載予定の品");
      const description = escapeHtml(item.description || "詳細は順次公開予定です。");
      return `
        <article class="placeholder-card">
          <span class="placeholder-card__icon" aria-hidden="true">品</span>
          <h3>${title}</h3>
          <p>${description}</p>
        </article>
      `;
    })
    .join("");
}

function renderNews(items) {
  const container = document.getElementById("news-list");
  if (!container) return;

  const source = Array.isArray(items) && items.length > 0 ? items : waitingNews;
  container.innerHTML = source
    .slice(0, 3)
    .map((entry) => {
      const text = escapeHtml(entry.text || entry.title || "ただいまホームページを準備しています。");
      return `
        <li class="news-list__item${entry.date ? "" : " news-list__item--waiting"}">
          ${entry.date ? `<time datetime="${escapeHtml(entry.date)}">${escapeHtml(entry.date)}</time>` : ""}
          <p>${text}</p>
        </li>
      `;
    })
    .join("");
}

async function readJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }
  return response.json();
}

async function bootstrapHomePage() {
  try {
    const [items, news] = await Promise.all([
      readJson("data/items.json"),
      readJson("data/news.json")
    ]);

    renderItems(items);
    renderNews(news);
  } catch (error) {
    console.warn("JSON data could not be loaded. Waiting-state content is used.", error);
    renderWaitingItems();
    renderNews(waitingNews);
  }
}

bootstrapHomePage();
