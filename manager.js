let allMemos = {};
let activeTag = null;

async function load() {
  const res = await chrome.runtime.sendMessage({ type: "GET_ALL_MEMOS" });
  allMemos = res.memos || {};
  renderAllTags();
  render();
}

function renderAllTags() {
  const tagSet = new Set();
  Object.values(allMemos).forEach(m => (m.tags || []).forEach(t => tagSet.add(t)));
  const container = document.getElementById("allTags");
  if (tagSet.size === 0) {
    container.innerHTML = '<span style="font-size:12px;color:#6c7086">タグなし</span>';
    return;
  }
  container.innerHTML = [...tagSet].map(t =>
    `<span class="tag${activeTag === t ? " active" : ""}" data-tag="${esc(t)}">${esc(t)}</span>`
  ).join("");
  container.querySelectorAll(".tag").forEach(el => {
    el.addEventListener("click", () => {
      const t = el.dataset.tag;
      activeTag = activeTag === t ? null : t;
      renderAllTags();
      render();
    });
  });
}

function render() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  const sort = document.getElementById("sortSelect").value;

  let entries = Object.entries(allMemos);

  if (activeTag) {
    entries = entries.filter(([, m]) => (m.tags || []).includes(activeTag));
  }

  if (query) {
    entries = entries.filter(([url, m]) =>
      url.toLowerCase().includes(query) ||
      (m.title || "").toLowerCase().includes(query) ||
      (m.text || "").toLowerCase().includes(query) ||
      (m.tags || []).some(t => t.toLowerCase().includes(query))
    );
  }

  if (sort === "newest") entries.sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));
  else if (sort === "oldest") entries.sort((a, b) => (a[1].updatedAt || 0) - (b[1].updatedAt || 0));
  else entries.sort((a, b) => (a[1].title || a[0]).localeCompare(b[1].title || b[0]));

  document.getElementById("count").textContent = `${entries.length} 件`;
  const grid = document.getElementById("grid");
  const empty = document.getElementById("empty");

  if (entries.length === 0) {
    grid.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  grid.innerHTML = entries.map(([url, m]) => cardHtml(url, m)).join("");

  grid.querySelectorAll(".card-url").forEach(el => {
    el.addEventListener("click", () => chrome.tabs.create({ url: el.dataset.url }));
  });

  grid.querySelectorAll(".btn-del").forEach(el => {
    el.addEventListener("click", async () => {
      if (!confirm("このメモを削除しますか？")) return;
      await chrome.runtime.sendMessage({ type: "DELETE_MEMO", url: el.dataset.url });
      delete allMemos[normalizeUrl(el.dataset.url)];
      renderAllTags();
      render();
    });
  });

  grid.querySelectorAll(".expand-btn").forEach(el => {
    el.addEventListener("click", () => {
      const body = el.closest(".card").querySelector(".card-body");
      const fade = el.closest(".card").querySelector(".card-fade");
      body.classList.toggle("expanded");
      if (body.classList.contains("expanded")) {
        fade.style.display = "none";
        el.textContent = "▲ 折りたたむ";
      } else {
        fade.style.display = "";
        el.textContent = "▼ もっと見る";
      }
    });
  });

  grid.querySelectorAll(".card-footer .tag").forEach(el => {
    el.addEventListener("click", () => {
      const t = el.dataset.tag;
      activeTag = activeTag === t ? null : t;
      renderAllTags();
      render();
    });
  });
}

function cardHtml(url, m) {
  const date = m.updatedAt ? new Date(m.updatedAt).toLocaleDateString("ja-JP") : "";
  const tagsHtml = (m.tags || []).map(t =>
    `<span class="tag" data-tag="${esc(t)}">${esc(t)}</span>`
  ).join("");
  const isLong = (m.text || "").length > 150 || (m.text || "").split("\n").length > 5;

  return `
    <div class="card">
      <div class="card-header">
        <div class="card-title">${esc(m.title || url)}</div>
      </div>
      <div class="card-url" data-url="${esc(url)}" title="${esc(url)}">${esc(url)}</div>
      <div class="card-body${isLong ? "" : ""}">
        ${esc(m.text || "")}
        ${isLong ? '<div class="card-fade"></div>' : ""}
      </div>
      ${isLong ? `<button class="expand-btn">▼ もっと見る</button>` : ""}
      <div class="card-footer">
        ${tagsHtml}
        <span class="card-date">${esc(date)}</span>
      </div>
      <div class="card-actions">
        <button class="btn-sm btn-del" data-url="${esc(url)}">🗑 削除</button>
      </div>
    </div>
  `;
}

function esc(str) {
  return String(str || "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch {
    return url;
  }
}

document.getElementById("searchInput").addEventListener("input", render);
document.getElementById("sortSelect").addEventListener("change", render);

load();
