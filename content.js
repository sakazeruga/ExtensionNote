const OVERLAY_ID = "webmemo-overlay";

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch {
    return url;
  }
}

async function getMemo() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type: "GET_MEMO", url: location.href }, res => {
      resolve(res?.memo || null);
    });
  });
}

async function getOverlayEnabled() {
  return new Promise(resolve => {
    chrome.storage.local.get("overlayEnabled", data => {
      const map = data.overlayEnabled || {};
      resolve(!!map[normalizeUrl(location.href)]);
    });
  });
}

function getOrCreateOverlay() {
  let el = document.getElementById(OVERLAY_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = OVERLAY_ID;
    document.body.appendChild(el);
  }
  return el;
}

function removeOverlay() {
  const el = document.getElementById(OVERLAY_ID);
  if (el) el.remove();
}

async function renderOverlay() {
  const enabled = await getOverlayEnabled();
  if (!enabled) {
    removeOverlay();
    return;
  }
  const memo = await getMemo();
  if (!memo || !memo.text.trim()) {
    removeOverlay();
    return;
  }

  const el = getOrCreateOverlay();
  const tagsHtml = (memo.tags || []).map(t =>
    `<span class="wm-tag">${escHtml(t)}</span>`
  ).join("");

  el.innerHTML = `
    <div class="wm-header">
      <span class="wm-icon">📝</span>
      <span class="wm-label">メモ</span>
      <button class="wm-close" title="閉じる">×</button>
    </div>
    <div class="wm-body">${escHtml(memo.text)}</div>
    ${tagsHtml ? `<div class="wm-tags">${tagsHtml}</div>` : ""}
  `;

  el.querySelector(".wm-close").addEventListener("click", async () => {
    const overlayData = await chrome.storage.local.get("overlayEnabled");
    const map = overlayData.overlayEnabled || {};
    map[normalizeUrl(location.href)] = false;
    await chrome.storage.local.set({ overlayEnabled: map });
    removeOverlay();
  });

  makeDraggable(el);
}

function escHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function makeDraggable(el) {
  let startX, startY, origTop, origRight;
  el.querySelector(".wm-header").addEventListener("mousedown", e => {
    if (e.target.classList.contains("wm-close")) return;
    startX = e.clientX;
    startY = e.clientY;
    const rect = el.getBoundingClientRect();
    origTop = rect.top;
    origRight = window.innerWidth - rect.right;
    el.style.transition = "none";

    function onMove(e) {
      const dx = startX - e.clientX;
      const dy = e.clientY - startY;
      el.style.top = Math.max(0, origTop + dy) + "px";
      el.style.right = Math.max(0, origRight + dx) + "px";
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    e.preventDefault();
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "MEMO_UPDATED" || message.type === "OVERLAY_TOGGLE") {
    renderOverlay();
  }
});

// ページ読み込み時に表示
renderOverlay();
