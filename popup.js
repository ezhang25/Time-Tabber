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
        if (!li) continue;

        if (top[i]) {
            const [domain, secs] = top[i];
            li.textContent = `${domain} — ${formatTime(secs)}`;
        } 
        else {
            li.textContent = "";
        }
    }
}


function getCurrentTimeFormatted() {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();

    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;

    document.getElementById('time').textContent = `${hours}:${minutes}:${seconds}`;
}

getCurrentTimeFormatted();
renderTop5();

setInterval(getCurrentTimeFormatted, 1000);
setInterval(renderTop5, 1000);
