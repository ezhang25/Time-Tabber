function dateKey() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `dayTotals:${yyyy}-${mm}-${dd}`;
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m < 60) return `${m}m ${s}s`;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}h ${mm}m`;
}

async function renderTop5() {
    const key = dateKey();
    const data = await chrome.storage.local.get(key);
    const totals = data[key] ?? {};

    const entries = Object.entries(totals);
    entries.sort((a, b) => b[1] - a[1]);

    const top = entries.slice(0, 5);

    for (let i = 0; i < 5; i++) {
        const li = document.getElementById(`used${i + 1}`);
        const link = document.getElementById(`used${i + 1}link`);

        if (!li) continue;

        if (top[i]) {
            const [domain, secs] = top[i];

            if (link) {
                link.textContent = `${domain} — ${formatTime(secs)}`;
                link.href = `https://${domain}`;
            } 
            else {
                li.textContent = `${domain} — ${formatTime(secs)}`;
            }
        } 
        else {
            li.textContent = "";
        }

    }
}

async function getDailyScreenTime() {
    const key = dateKey();
    const result = await chrome.storage.local.get(key);

    const dayData = result[key] || {};
    const totalTime = Object.values(dayData)
        .filter(value => typeof value === 'number')
        .reduce((acc, current) => acc + current, 0);

    document.getElementById('time').textContent = `Screentime Today: ${formatTime(totalTime)}`;
}

function renderLimitTag(cleanUrl, seconds) {
    const limitContainer = document.createElement("div");
    limitContainer.classList.add("limit-tag");

    const limitText = document.createElement("span");
    limitText.classList.add("limit-tag-site");
    limitText.textContent = cleanUrl;
    limitContainer.appendChild(limitText);

    const limitTime = document.createElement("span");
    limitTime.classList.add("limit-tag-time");
    limitTime.textContent = formatTime(seconds);
    limitContainer.appendChild(limitTime);

    const removeBtn = document.createElement("button");
    removeBtn.classList.add("limit-tag-remove");
    removeBtn.textContent = "✕";
    limitContainer.appendChild(removeBtn);

    document.getElementById('current-limit').appendChild(limitContainer);

    removeBtn.addEventListener('click', () => {
        limitContainer.remove();
        chrome.storage.local.remove(cleanUrl);
    });
}

async function addTimeLimit(url, seconds) {
    const cleanUrl = new URL(url.startsWith('http') ? url : 'https://' + url).hostname;

    const result = await chrome.storage.local.get(cleanUrl);
    if (result[cleanUrl]) {
        alert(`Time limit for ${cleanUrl} is already set.`);
        return;
    }

    chrome.storage.local.set({ [cleanUrl]: Number(seconds) });
    renderLimitTag(cleanUrl, seconds);
}

function loadTimeLimits() {
    chrome.storage.local.get(null, (items) => {
        for (const [key, value] of Object.entries(items)) {
            if (key.startsWith('dayTotals:')) continue;
            renderLimitTag(key, value);
        }
    });
}

document.getElementById('url-form').addEventListener('submit', (event) => {
    event.preventDefault();

    const url = document.getElementById('url').value;
    const timeLimit = document.getElementById('time-limit').value;

    if (url && timeLimit) {
        addTimeLimit(url, timeLimit);
    }
});

loadTimeLimits();
getDailyScreenTime();
renderTop5();

setInterval(getDailyScreenTime, 1000);
setInterval(renderTop5, 1000);

