let currentTab = null;

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  document.getElementById("pageUrl").textContent = tab.url;
  document.getElementById("pageTitle").textContent = tab.title || "";

  const res = await chrome.runtime.sendMessage({ type: "GET_MEMO", url: tab.url });
  if (res.memo) {
    document.getElementById("memoText").value = res.memo.text || "";
    document.getElementById("tagsInput").value = (res.memo.tags || []).join(", ");
  }

  // オーバーレイ表示状態を取得
  const overlayData = await chrome.storage.local.get("overlayEnabled");
  const overlayEnabled = overlayData.overlayEnabled || {};
  const key = normalizeUrl(tab.url);
  document.getElementById("overlayToggle").checked = !!overlayEnabled[key];
}

document.getElementById("saveBtn").addEventListener("click", async () => {
  const text = document.getElementById("memoText").value;
  const tagsRaw = document.getElementById("tagsInput").value;
  const tags = tagsRaw.split(",").map(t => t.trim()).filter(Boolean);

  await chrome.runtime.sendMessage({
    type: "SAVE_MEMO",
    url: currentTab.url,
    title: currentTab.title,
    memo: { text, tags }
  });

  // オーバーレイ状態も保存
  await updateOverlayState();

  // コンテンツスクリプトに更新を通知
  chrome.tabs.sendMessage(currentTab.id, { type: "MEMO_UPDATED" }).catch(() => {});

  showStatus("保存しました ✓");
});

document.getElementById("deleteBtn").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "DELETE_MEMO", url: currentTab.url });
  document.getElementById("memoText").value = "";
  document.getElementById("tagsInput").value = "";
  chrome.tabs.sendMessage(currentTab.id, { type: "MEMO_UPDATED" }).catch(() => {});
  showStatus("削除しました");
});

document.getElementById("overlayToggle").addEventListener("change", async () => {
  await updateOverlayState();
  chrome.tabs.sendMessage(currentTab.id, { type: "OVERLAY_TOGGLE" }).catch(() => {});
});

document.getElementById("managerBtn").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

async function updateOverlayState() {
  const overlayData = await chrome.storage.local.get("overlayEnabled");
  const overlayEnabled = overlayData.overlayEnabled || {};
  const key = normalizeUrl(currentTab.url);
  overlayEnabled[key] = document.getElementById("overlayToggle").checked;
  await chrome.storage.local.set({ overlayEnabled });
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch {
    return url;
  }
}

function showStatus(msg) {
  const el = document.getElementById("status");
  el.textContent = msg;
  setTimeout(() => { el.textContent = ""; }, 2000);
}

init();
