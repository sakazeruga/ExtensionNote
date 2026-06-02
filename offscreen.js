// このページのlocalStorageがメモの保存場所（メモURL = chrome-extension://<id>/offscreen.html）

// 除去するトラッキング系パラメータ
const TRACKING_PARAMS = new Set([
  "utm_source","utm_medium","utm_campaign","utm_term","utm_content","utm_id",
  "fbclid","gclid","msclkid","twclid","dclid","yclid",
  "_ga","_gl","mc_cid","mc_eid",
  "ref","referrer","source","from","via"
]);

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    // トラッキングパラメータを除去し、残りをキー順にソート
    const params = [...u.searchParams.entries()]
      .filter(([k]) => !TRACKING_PARAMS.has(k))
      .sort(([a], [b]) => a.localeCompare(b));
    const search = params.length
      ? "?" + params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")
      : "";
    return u.origin + u.pathname + search;
  } catch {
    return url;
  }
}

function getAllMemos() {
  const raw = localStorage.getItem("webmemo_memos");
  return raw ? JSON.parse(raw) : {};
}

function saveMemos(memos) {
  localStorage.setItem("webmemo_memos", JSON.stringify(memos));
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.target !== "offscreen") return;

  if (message.type === "GET_MEMO") {
    const memos = getAllMemos();
    const key = normalizeUrl(message.url);
    sendResponse({ memo: memos[key] || null });
  }

  if (message.type === "SAVE_MEMO") {
    const memos = getAllMemos();
    const key = normalizeUrl(message.url);
    if (!message.memo.text.trim() && !(message.memo.tags?.length)) {
      delete memos[key];
    } else {
      memos[key] = {
        url: message.url,
        title: message.title,
        text: message.memo.text,
        tags: message.memo.tags || [],
        updatedAt: Date.now()
      };
    }
    saveMemos(memos);
    sendResponse({ ok: true });
  }

  if (message.type === "GET_ALL_MEMOS") {
    sendResponse({ memos: getAllMemos() });
  }

  if (message.type === "DELETE_MEMO") {
    const memos = getAllMemos();
    const key = normalizeUrl(message.url);
    delete memos[key];
    saveMemos(memos);
    sendResponse({ ok: true });
  }

  return true;
});
