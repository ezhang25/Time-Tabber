const notifiedLimits = new Set();
let lastActiveDomain = null;
let lastTimestamp = null;

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
    return null;
}

async function isActive() {
    const currentState = await chrome.idle.queryState(15);
    return currentState === "active";
}

async function addSeconds(domain, secondsToAdd) {
    if (secondsToAdd <= 0) return;
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

async function flushTime() {
    if (lastActiveDomain && lastTimestamp) {
        const now = Date.now();
        const elapsed = Math.round((now - lastTimestamp) / 1000);
        await addSeconds(lastActiveDomain, elapsed);
        await checkLimits(lastActiveDomain);
        lastTimestamp = now;
    }
}

async function track() {
    const active = await isActive();

    if (!active) {
        await flushTime();
        lastActiveDomain = null;
        lastTimestamp = null;
        return;
    }

    const domain = await getActiveTabUrl();
    if (!domain) {
        await flushTime();
        lastActiveDomain = null;
        lastTimestamp = null;
        return;
    }

    if (domain !== lastActiveDomain) {
        await flushTime();
        lastActiveDomain = domain;
        lastTimestamp = Date.now();
    }

    if (!lastTimestamp) {
        lastTimestamp = Date.now();
    }

    await flushTime();
}

chrome.alarms.create('tracker', { periodInMinutes: 0.5 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'tracker') {
        await track();
    }
});

chrome.tabs.onActivated.addListener(async () => {
    await track();
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    if (changeInfo.url) {
        await track();
    }
});

chrome.windows.onFocusChanged.addListener(async () => {
    await track();
});

chrome.runtime.onStartup.addListener(() => {
    chrome.alarms.create('tracker', { periodInMinutes: 0.5 });
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('tracker', { periodInMinutes: 0.5 });
});

setInterval(async () => {
    await track();
}, 1000);