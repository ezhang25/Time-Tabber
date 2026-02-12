function dateKey() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `dayTotals:${yyyy}-${mm}-${dd}`;
}

async function getActiveTabUrl() {
    let queryOptions = { active: true, lastFocusedWindow: true };
    
    let [tab] = await chrome.tabs.query(queryOptions);

    if (tab && tab.url) {
        const webUrl = new URL(tab.url);
        return webUrl.hostname.replace(/^www\./, "");
    }
}

async function isIdle(){
    const currentState = await chrome.idle.queryState(15);
    return currentState === "active";
}

async function addSeconds(domain, secondsToAdd) {
  const key = dateKey();
  const data = await chrome.storage.local.get(key);
  const totals = data[key] ?? {};
  totals[domain] = (totals[domain] ?? 0) + secondsToAdd;
  await chrome.storage.local.set({ [key]: totals });
}

setInterval(async () => {
  if (!(await isIdle())) return;

  const domain = await getActiveTabUrl();
  if (!domain) return;

  await addSeconds(domain, 1);
}, 1000);