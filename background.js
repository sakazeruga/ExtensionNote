// offscreen.html (localStorage保存先URL) を介してデータを読み書きする

async function ensureOffscreen() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"]
  });
  if (existingContexts.length > 0) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["LOCAL_STORAGE"],
    justification: "メモデータをlocalStorageに保存するため"
  });
}

async function sendToOffscreen(message) {
  await ensureOffscreen();
  return chrome.runtime.sendMessage({ ...message, target: "offscreen" });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === "offscreen") return; // offscreen宛はスルー

  if (["GET_MEMO", "SAVE_MEMO", "GET_ALL_MEMOS", "DELETE_MEMO"].includes(message.type)) {
    sendToOffscreen(message).then(sendResponse);
    return true;
  }
});
