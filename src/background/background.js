const notifiedLimits = new Set();

console.log("BACKGROUND SCRIPT LOADED");

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

    if (tab && tab.url && tab.url.startsWith('http')) {
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

async function checkLimits(domain) {
    const limitData = await chrome.storage.local.get(domain);
    const limit = limitData[domain];

    if (!limit) return;

    const key = dateKey();
    const data = await chrome.storage.local.get(key);
    const totals = data[key] ?? {};
    const currentTime = totals[domain] ?? 0;

    if (currentTime >= limit) {
        if (notifiedLimits.has(domain)) return;
        notifiedLimits.add(domain);
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: (domain) => {
                        alert(`You've reached your time limit for ${domain}!`);
                },
                    args: [domain]
                });
            }
     });
    }
}

setInterval(async () => {
    console.log("a");
    if (!(await isIdle())) return;
    console.log("b");

    const domain = await getActiveTabUrl();
    if (!domain) return;

    await addSeconds(domain, 1);
    await checkLimits(domain);
    console.log("c");
}, 1000);