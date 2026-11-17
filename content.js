let localMessageQueue = [];
let flushTimeout = null;
const FLUSH_DEBOUNCE_MS = 100;
let isUserLoggedIn = false;
let messageBuffer = [];
let loginStatusConfirmed = false;
const LOGIN_TIMEOUT_MS = 5000;

let currentMessageTypeSettings = {};
let currentMessageTypeSettingsAlwaysSend = [];

async function fetchMessageTypeSettings() {
    try {
        const settings = await chrome.runtime.sendMessage({ type: 'GET_MESSAGE_TYPE_SETTINGS' });
        if (settings) currentMessageTypeSettings = settings;
        const settingsAlways = await chrome.runtime.sendMessage({ type: 'GET_MESSAGE_TYPE_SETTINGS_ALWAYS_SEND' });
        if (settingsAlways) currentMessageTypeSettingsAlwaysSend = settingsAlways;
    } catch (error) {
        console.error('[PrUn WS Forwarder Content] Failed to fetch message type settings:', error);
    }
}

function windowMessageListener(event) {
    if (event.source !== window || !event.data || !event.data.type) return;
    if (event.data.type === 'prun-ws-message-parsed') {
        const message = event.data.message;
        if (message && event.data.context) {
            message.context = event.data.context;
        }
        if (loginStatusConfirmed) {
            processMessage(message);
        } else {
            messageBuffer.push(message);
        }
    } else if (event.data.type === 'prun-get-auth-token') {
        Promise.all([
            chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN' }).catch(() => null),
            chrome.runtime.sendMessage({ type: 'GET_ENV_MODE' }).catch(() => null)
        ]).then(([authRes, envRes]) => {
            const token = authRes?.token || null;
            const currentEnv = envRes?.currentEnv || 'prod';
            const serverUrl = envRes?.config?.DATA_SERVER_URL || (currentEnv === 'dev' ? 'http://localhost:9900' : 'https://api.punoted.net');
            window.postMessage({
                type: 'prun-auth-token-response',
                token: token,
                currentEnv: currentEnv,
                serverUrl: serverUrl
            }, '*');
        }).catch(() => {
            window.postMessage({ type: 'prun-auth-token-response', token: null, currentEnv: 'prod', serverUrl: 'https://api.punoted.net' }, '*');
        });
    }
}

window.addEventListener("message", windowMessageListener);

let lastSentContext = null;

// ============================================================================
// ACTIVITY TIME TRACKING & OFFLINE BRIEFING DETECTOR
// ============================================================================
// Production mode: 10 * 60 * 1000 (10 minutes offline threshold)
const OFFLINE_THRESHOLD_MS = 0//10 * 60 * 1000;
let offlineBriefingShown = false;
let sessionSecondsAway = 0;
// Track state captured during initial boot for offline briefing
let capturedFulfilledOrders = [];
let capturedCurrentCash = null;
let capturedFleetStatus = { total: 0, inFlight: 0, inPort: 0 };
let lastKnownOnlineTime = 0;

// 1. Detect if returning from offline vs simple reload
(function detectOfflineReturn() {
    try {
        const now = Date.now();
        chrome.storage.local.get(['punoted_last_heartbeat', 'punoted_briefing_disabled'], (res) => {
            const lastBeat = res.punoted_last_heartbeat || 0;
            lastKnownOnlineTime = lastBeat;
            if (lastBeat > 0) {
                const diffMs = now - lastBeat;
                if (diffMs >= OFFLINE_THRESHOLD_MS) {
                    sessionSecondsAway = Math.round(diffMs / 1000);
                }
            }
            chrome.storage.local.set({ punoted_last_heartbeat: now });
        });
    } catch (e) { }
})();

// 2. Continuous Activity Time Heartbeat (Focus vs Open)
let secondsFocusedAccumulator = 0;
let secondsOpenAccumulator = 0;

setInterval(() => {
    secondsOpenAccumulator += 5;
    if (document.hasFocus() && document.visibilityState === 'visible') {
        secondsFocusedAccumulator += 5;
    }

    // Every 30 seconds, persist to storage
    if (secondsOpenAccumulator >= 30) {
        const now = Date.now();
        const today = new Date().toISOString().split('T')[0];

        try {
            chrome.storage.local.get(['punoted_activity_stats'], (res) => {
                const stats = res.punoted_activity_stats || {};
                if (!stats[today]) {
                    stats[today] = { active_seconds: 0, open_seconds: 0 };
                }
                stats[today].active_seconds += secondsFocusedAccumulator;
                stats[today].open_seconds += secondsOpenAccumulator;

                chrome.storage.local.set({
                    punoted_activity_stats: stats,
                    punoted_last_heartbeat: now
                });

                secondsFocusedAccumulator = 0;
                secondsOpenAccumulator = 0;
            });
        } catch (e) {
            secondsFocusedAccumulator = 0;
            secondsOpenAccumulator = 0;
        }
    }
}, 5000);

window.addEventListener("beforeunload", () => {
    try {
        chrome.storage.local.set({ punoted_last_heartbeat: Date.now() });
    } catch (e) { }
});

async function triggerOfflineBriefingIfEligible() {
    if (offlineBriefingShown) return;
    offlineBriefingShown = true;

    // Check if user disabled the briefing popup or if threshold was not reached
    try {
        const pref = await chrome.storage.local.get(['punoted_briefing_disabled', 'ingameUiSettings']);
        if (pref.punoted_briefing_disabled || pref.ingameUiSettings?.offlineBriefing !== true) return;

        // Briefing only displays when offline duration exceeds OFFLINE_THRESHOLD_MS (10 min)
        if (sessionSecondsAway < (OFFLINE_THRESHOLD_MS / 1000)) return;
    } catch (e) { }

    // Small delay so game state messages finish loading into memory
    setTimeout(async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const storageRes = await chrome.storage.local.get(['punoted_activity_stats']);
            const todayStats = storageRes.punoted_activity_stats?.[today] || { active_seconds: 0, open_seconds: 0 };

            // Include current pending accumulator seconds for exact active / open duration
            const effectiveActiveSeconds = (todayStats.active_seconds || 0) + secondsFocusedAccumulator;
            const effectiveOpenSeconds = (todayStats.open_seconds || 0) + secondsOpenAccumulator;

            let financialChange = 0;
            let currency = 'ICA';

            // Query backend for last recorded balance to compute cashflow difference
            try {
                const authRes = await chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN' });
                const token = authRes?.token;
                if (token && capturedCurrentCash !== null) {
                    const settings = await chrome.runtime.sendMessage({ type: 'GET_ENV_MODE' });
                    const serverUrl = settings?.config?.DATA_SERVER_URL || 'https://api.punoted.net';
                    const resp = await fetch(`${serverUrl}/v1/accounting/user`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'X-Data-Token': token
                        }
                    });
                    if (resp.ok) {
                        const accData = await resp.json();
                        const primaryAcc = Array.isArray(accData) ? accData.find(a => a.Currency === 'ICA' || a.balancecurrencycode === 'ICA') : null;
                        const prevBalance = primaryAcc ? (primaryAcc.Balance || primaryAcc.balanceamount || 0) : null;
                        if (prevBalance !== null && capturedCurrentCash !== null) {
                            financialChange = Math.round(capturedCurrentCash - prevBalance);
                        }
                    }
                }
            } catch (err) {
                console.debug('[PUNoted Briefing] Cash diff check skipped:', err);
            }

            if (typeof window.__PUNOTED_SHOW_OFFLINE_BRIEFING === 'function') {
                window.__PUNOTED_SHOW_OFFLINE_BRIEFING({
                    offlineSeconds: sessionSecondsAway,
                    activeTodaySeconds: effectiveActiveSeconds,
                    openTodaySeconds: effectiveOpenSeconds,
                    fulfilledOrdersCount: capturedFulfilledOrders.length,
                    fulfilledOrders: capturedFulfilledOrders,
                    financialChange: financialChange,
                    currency: currency,
                    fleetStatus: capturedFleetStatus
                });
            }
        } catch (e) {
            console.error('[PUNoted] Failed to show offline briefing:', e);
        }
    }, 2000);
}

function checkAndNotifyContext() {
    try {
        const url = window.location.href || '';
        const m = url.match(/context=([0-9a-fA-F\-]{16,64})/i);
        const ctxId = m ? m[1] : null;
        if (ctxId && ctxId !== lastSentContext) {
            lastSentContext = ctxId;
            if (chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({ type: 'UPDATE_CONTEXT', context: ctxId }).catch(() => { });
            }
        }
    } catch (e) { }
}

const CHANGELOG_LINKS = {
    website: 'https://punoted.net',
    docs: 'https://api.punoted.net/v1/docs',
    discordBug: 'https://discord.com/channels/1219865957204365353/1511396996244574299',
    discordSuggestion: 'https://discord.com/channels/1219865957204365353/1511344224937705582'
};

async function executeNativeBufferCommand(commandStr) {
    const newBfrBtn = document.getElementById("TOUR_TARGET_BUTTON_BUFFER_NEW");
    if (!newBfrBtn) return;
    newBfrBtn.click();

    let cmdInput = null;
    for (let i = 0; i < 25; i++) {
        await new Promise((resolve) => setTimeout(resolve, 80));
        const emptyBufferInputs = document.querySelectorAll(
            'input[placeholder="Enter content command"]'
        );
        if (emptyBufferInputs.length > 0) {
            cmdInput = emptyBufferInputs[emptyBufferInputs.length - 1];
            break;
        }
    }
    if (!cmdInput) return;

    cmdInput.focus();
    const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
    )?.set;
    if (setter) {
        setter.call(cmdInput, commandStr);
    } else {
        cmdInput.value = commandStr;
    }

    cmdInput.dispatchEvent(new Event("input", { bubbles: true }));
    cmdInput.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 60));

    const form = cmdInput.closest("form");
    if (form) {
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    } else {
        cmdInput.dispatchEvent(
            new KeyboardEvent("keydown", {
                key: "Enter",
                code: "Enter",
                keyCode: 13,
                which: 13,
                bubbles: true,
            })
        );
        cmdInput.dispatchEvent(
            new KeyboardEvent("keyup", {
                key: "Enter",
                code: "Enter",
                keyCode: 13,
                which: 13,
                bubbles: true,
            })
        );
    }
}

function openPUNotedChangelogBuffer() {
    const existingTile = Array.from(document.querySelectorAll('div[class*="TileFrame__frame"]')).find(tile => {
        const cmdEl = tile.querySelector('div[class*="TileFrame__cmd"]');
        if (!cmdEl) return false;
        const text = cmdEl.textContent.trim().toUpperCase();
        return text === 'XIT PNT_CHANGELOG' || text === 'XIT CHANGELOG' || text === 'PNT_CHANGELOG';
    });

    if (existingTile) {
        existingTile.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        existingTile.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
        existingTile.style.boxShadow = '0 0 25px rgba(139, 92, 246, 0.85)';
        setTimeout(() => { existingTile.style.boxShadow = ''; }, 1200);
        return;
    }

    executeNativeBufferCommand('XIT PNT_CHANGELOG');
}

function mountChangelogApp(tileNode) {
    const tileBody = tileNode.querySelector('div[class*="TileFrame__body"]');
    if (!tileBody || tileBody.dataset.pntChangelogMounted === 'true') return;

    tileBody.dataset.pntChangelogMounted = 'true';
    tileBody.innerHTML = '';
    tileBody.style.position = 'relative';
    tileBody.style.width = '100%';
    tileBody.style.height = '100%';
    tileBody.style.overflow = 'hidden';

    const titleEl = tileNode.querySelector('div[class*="TileFrame__title"]');
    if (titleEl) {
        titleEl.textContent = 'PUNOTED // CHANGELOG';
    }

    const manifest = chrome.runtime.getManifest();
    const ver = manifest?.version || '1.3.0';

    const container = document.createElement('div');
    container.className = 'pnt-changelog-scroll';
    const scrollStyle = document.createElement('style');
    scrollStyle.textContent = `
        .pnt-changelog-scroll::-webkit-scrollbar { width: 8px; }
        .pnt-changelog-scroll::-webkit-scrollbar-track { background: rgba(10, 10, 20, 0.5); }
        .pnt-changelog-scroll::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.45); border-radius: 4px; }
        .pnt-changelog-scroll::-webkit-scrollbar-thumb:hover { background: rgba(168, 85, 247, 0.75); }
    `;
    container.appendChild(scrollStyle);
    container.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        box-sizing: border-box;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        padding: 14px 18px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        background: linear-gradient(180deg, rgba(14, 15, 30, 0.98) 0%, rgba(8, 8, 18, 0.98) 100%);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 12px;
        color: #e2e8f0;
        line-height: 1.5;
        scrollbar-width: thin;
        scrollbar-color: rgba(139, 92, 246, 0.5) transparent;
    `;

    const statusCard = document.createElement('div');
    statusCard.style.cssText = `
        background: linear-gradient(135deg, rgba(30, 27, 75, 0.45) 0%, rgba(15, 23, 42, 0.6) 100%);
        border: 1px solid rgba(139, 92, 246, 0.35);
        border-radius: 6px;
        padding: 10px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
    `;

    const statusLeft = document.createElement('div');
    statusLeft.style.cssText = 'display: flex; flex-direction: column; gap: 3px;';
    statusLeft.innerHTML = `
        <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.08em; color: #a78bfa; text-transform: uppercase;">
            PUNOTED TELEMETRY // CORE FORWARDER
        </div>
        <div style="font-size: 13px; font-weight: 700; color: #f8fafc; display: flex; align-items: center; gap: 8px;">
            <span>Forwarder Version:</span>
            <span style="background: rgba(124, 58, 237, 0.25); color: #c4b5fd; border: 1px solid rgba(139, 92, 246, 0.4); padding: 1px 8px; border-radius: 4px; font-size: 12px; font-weight: 800; font-family: monospace;">v${ver}</span>
        </div>
    `;

    const statusRight = document.createElement('div');
    statusRight.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(34, 197, 94, 0.12);
        border: 1px solid rgba(34, 197, 94, 0.35);
        color: #4ade80;
        font-size: 11px;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 5px;
        letter-spacing: 0.04em;
    `;
    statusRight.innerHTML = `<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#4ade80; box-shadow:0 0 8px #4ade80;"></span> UP TO DATE`;

    statusCard.appendChild(statusLeft);
    statusCard.appendChild(statusRight);
    container.appendChild(statusCard);

    const navBar = document.createElement('div');
    navBar.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px;';

    const actions = [
        { label: 'PUNOTED WEB', url: CHANGELOG_LINKS.website, icon: '🌐' },
        { label: 'API DOCS', url: CHANGELOG_LINKS.docs, icon: '📖' },
        { label: 'REPORT A BUG', url: CHANGELOG_LINKS.discordBug, icon: '🐛' },
        { label: 'SUGGESTION', url: CHANGELOG_LINKS.discordSuggestion, icon: '💡' }
    ];

    actions.forEach(act => {
        const a = document.createElement('a');
        a.href = act.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            background: rgba(26, 26, 56, 0.65);
            border: 1px solid rgba(139, 92, 246, 0.3);
            color: #d8b4fe;
            padding: 7px 10px;
            border-radius: 5px;
            font-size: 11px;
            font-weight: 700;
            text-decoration: none;
            letter-spacing: 0.04em;
            transition: all 0.15s ease;
            white-space: nowrap;
        `;
        a.innerHTML = `<span style="font-size: 13px;">${act.icon}</span> <span>${act.label} ↗</span>`;
        a.onmouseover = () => {
            a.style.background = 'rgba(124, 58, 237, 0.4)';
            a.style.borderColor = 'rgba(168, 85, 247, 0.65)';
            a.style.color = '#ffffff';
            a.style.transform = 'translateY(-1px)';
        };
        a.onmouseout = () => {
            a.style.background = 'rgba(26, 26, 56, 0.65)';
            a.style.borderColor = 'rgba(139, 92, 246, 0.3)';
            a.style.color = '#d8b4fe';
            a.style.transform = 'none';
        };
        navBar.appendChild(a);
    });
    navBar.style.flexShrink = '0';
    container.appendChild(navBar);

    const titleRow = document.createElement('div');
    titleRow.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 4px;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.08em;
        color: #94a3b8;
        text-transform: uppercase;
    `;
    titleRow.innerHTML = `<span>Release</span><div style="flex-grow:1; height:1px; background:rgba(139, 92, 246, 0.2);"></div>`;
    titleRow.style.flexShrink = '0';
    container.appendChild(titleRow);

    const releasesContainer = document.createElement('div');
    releasesContainer.style.cssText = 'display: flex; flex-direction: column; gap: 12px; flex-shrink: 0;';
    releasesContainer.innerHTML = '<div style="color: #64748b; font-size: 11px; padding: 12px 0; text-align: center;">Loading release entries...</div>';
    container.appendChild(releasesContainer);

    fetch(chrome.runtime.getURL('changelog.json'))
        .then(r => r.json())
        .then(logs => {
            releasesContainer.innerHTML = '';
            logs.forEach(log => {
                const releaseCard = document.createElement('div');
                releaseCard.style.cssText = `
                    flex-shrink: 0;
                    border: 1px solid rgba(139, 92, 246, 0.22);
                    border-radius: 6px;
                    overflow: hidden;
                    background: rgba(16, 17, 36, 0.65);
                `;

                const relHead = document.createElement('div');
                relHead.style.cssText = `
                    background: linear-gradient(90deg, rgba(30, 27, 75, 0.8) 0%, rgba(18, 16, 45, 0.8) 100%);
                    border-bottom: 1px solid rgba(139, 92, 246, 0.2);
                    padding: 7px 12px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                `;

                const vLeft = document.createElement('div');
                vLeft.style.cssText = 'display: flex; align-items: center; gap: 8px;';

                const vPill = document.createElement('span');
                vPill.textContent = `v${log.version}`;
                vPill.style.cssText = `
                    font-size: 12px;
                    font-weight: 800;
                    color: #e9d5ff;
                    font-family: monospace;
                    letter-spacing: 0.03em;
                `;
                vLeft.appendChild(vPill);

                if (log.tag) {
                    const tagPill = document.createElement('span');
                    tagPill.textContent = log.tag;
                    tagPill.style.cssText = `
                        font-size: 9px;
                        font-weight: 800;
                        letter-spacing: 0.06em;
                        background: rgba(34, 197, 94, 0.15);
                        color: #86efac;
                        border: 1px solid rgba(34, 197, 94, 0.35);
                        padding: 1px 5px;
                        border-radius: 3px;
                    `;
                    vLeft.appendChild(tagPill);
                }

                const vDate = document.createElement('span');
                vDate.textContent = log.date || '';
                vDate.style.cssText = 'color: #94a3b8; font-size: 11px; font-family: monospace;';

                relHead.appendChild(vLeft);
                relHead.appendChild(vDate);
                releaseCard.appendChild(relHead);

                const relContent = document.createElement('div');
                relContent.style.cssText = 'padding: 10px 14px; display: flex; flex-direction: column; gap: 10px;';

                log.changes.forEach(ch => {
                    const grp = document.createElement('div');
                    grp.style.cssText = 'display: flex; flex-direction: column; gap: 5px;';

                    let badgeColor = '#94a3b8';
                    let badgeBg = 'rgba(148, 163, 184, 0.12)';
                    let badgeBorder = 'rgba(148, 163, 184, 0.3)';
                    const typeLower = (ch.type || '').toLowerCase();

                    if (typeLower.includes('add') || typeLower.includes('new')) {
                        badgeColor = '#86efac';
                        badgeBg = 'rgba(34, 197, 94, 0.12)';
                        badgeBorder = 'rgba(34, 197, 94, 0.35)';
                    } else if (typeLower.includes('improv') || typeLower.includes('change')) {
                        badgeColor = '#93c5fd';
                        badgeBg = 'rgba(59, 130, 246, 0.12)';
                        badgeBorder = 'rgba(59, 130, 246, 0.35)';
                    } else if (typeLower.includes('fix')) {
                        badgeColor = '#fde047';
                        badgeBg = 'rgba(234, 179, 8, 0.12)';
                        badgeBorder = 'rgba(234, 179, 8, 0.35)';
                    } else if (typeLower.includes('remov')) {
                        badgeColor = '#fca5a5';
                        badgeBg = 'rgba(239, 68, 68, 0.12)';
                        badgeBorder = 'rgba(239, 68, 68, 0.35)';
                    }

                    const grpHeader = document.createElement('div');
                    grpHeader.style.cssText = 'display: flex; align-items: center; gap: 6px;';

                    const typeBadge = document.createElement('span');
                    typeBadge.textContent = ch.type.toUpperCase();
                    typeBadge.style.cssText = `
                        font-size: 9px;
                        font-weight: 800;
                        letter-spacing: 0.07em;
                        color: ${badgeColor};
                        background: ${badgeBg};
                        border: 1px solid ${badgeBorder};
                        padding: 1px 5px;
                        border-radius: 3px;
                    `;
                    grpHeader.appendChild(typeBadge);
                    grp.appendChild(grpHeader);

                    const list = document.createElement('div');
                    list.style.cssText = 'display: flex; flex-direction: column; gap: 5px; padding-left: 2px;';
                    ch.items.forEach(it => {
                        const itemRow = document.createElement('div');
                        itemRow.style.cssText = 'display: flex; align-items: flex-start; gap: 7px; font-size: 11.5px; line-height: 1.45; color: #cbd5e1;';

                        let formattedText = it;
                        const colonIdx = it.indexOf(':');
                        if (colonIdx > 0 && colonIdx < 50) {
                            const prefix = it.substring(0, colonIdx + 1);
                            const rest = it.substring(colonIdx + 1);
                            formattedText = `<strong style="color: #f1f5f9; font-weight: 600;">${prefix}</strong>${rest}`;
                        }

                        itemRow.innerHTML = `<span style="color: ${badgeColor}; font-weight: bold; line-height: 1.2; font-size: 13px;">›</span><span>${formattedText}</span>`;
                        list.appendChild(itemRow);
                    });

                    grp.appendChild(list);
                    relContent.appendChild(grp);
                });

                releaseCard.appendChild(relContent);
                releasesContainer.appendChild(releaseCard);
            });
        })
        .catch(err => {
            releasesContainer.innerHTML = `<div style="color: #f87171; font-size: 11px; padding: 10px 0;">Could not load changelog: ${err.message}</div>`;
        });

    tileBody.appendChild(container);
}

function injectIntoXitCmds(tileNode) {
    const tbody = tileNode.querySelector("table tbody");
    if (!tbody || tbody.querySelector("#custom-cmd-pnt-changelog")) return;

    const tr = document.createElement("tr");
    tr.id = "custom-cmd-pnt-changelog";
    tr.innerHTML = `
        <td style="padding: 4px; font-weight: bold; color: #a78bfa; cursor: pointer;">PNT_CHANGELOG</td>
        <td style="padding: 4px; color: #ddd; cursor: pointer;">PUNoted Telemetry & System Changelog</td>
    `;
    tr.addEventListener("click", () => {
        executeNativeBufferCommand("XIT PNT_CHANGELOG");
    });
    tbody.appendChild(tr);
}

function observeChangelogBuffers() {
    let observerTimeout = null;
    const observer = new MutationObserver(() => {
        if (observerTimeout) return;
        observerTimeout = setTimeout(() => {
            document.querySelectorAll('div[class*="TileFrame__frame"]').forEach((tile) => {
                const cmdEl = tile.querySelector('div[class*="TileFrame__cmd"]');
                if (!cmdEl) return;
                const cmdText = cmdEl.textContent.trim().toUpperCase();
                if (cmdText === 'XIT PNT_CHANGELOG' || cmdText === 'XIT CHANGELOG' || cmdText === 'PNT_CHANGELOG') {
                    mountChangelogApp(tile);
                }
                if (cmdText === 'XIT CMDS') {
                    injectIntoXitCmds(tile);
                }
            });
            observerTimeout = null;
        }, 300);
    });

    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            if (document.body) observer.observe(document.body, { childList: true, subtree: true });
        });
    }
}

function injectPUNotedVersionFooter() {
    try {
        const foot = document.querySelector('div[class*="Frame__foot"]');
        if (!foot || document.getElementById('punoted-ext-version-badge')) return;

        const manifest = chrome.runtime.getManifest();
        const ver = manifest?.version || '1.3.0';

        const container = document.createElement('div');
        container.id = 'punoted-ext-version-badge';
        container.className = 'HeadItem__container___tp8YQo_ fonts__font-regular___Sxp1xjo type__type-regular___k8nHUfI';
        container.style.cssText = `
            display: inline-flex;
            align-items: center;
            margin-left: 8px;
            cursor: pointer;
            padding: 1px 6px;
            border-radius: 4px;
            transition: background 0.15s ease;
        `;
        container.onmouseover = () => { container.style.background = 'rgba(123, 104, 238, 0.18)'; };
        container.onmouseout = () => { container.style.background = 'transparent'; };
        container.onclick = (e) => {
            e.stopPropagation();
            openPUNotedChangelogBuffer();
        };

        const dot = document.createElement('div');
        dot.className = 'HeadItem__indicator___A_wijoE HeadItem__indicatorSuccess___o4IObCv';
        dot.style.marginRight = '4px';

        const label = document.createElement('div');
        label.className = 'HeadItem__label___tlXE4qZ';
        label.setAttribute('data-tooltip', `Click to open PUNoted v${ver} Changelog buffer`);
        label.setAttribute('data-tooltip-position', 'top');
        label.textContent = `PUNoted v${ver}`;
        label.style.color = '#a78bfa';
        label.style.fontWeight = '700';

        container.appendChild(dot);
        container.appendChild(label);

        const onlineCount = foot.querySelector('div[class*="UsersOnlineCount__container"]');
        if (onlineCount) {
            foot.insertBefore(container, onlineCount);
        } else {
            foot.appendChild(container);
        }
    } catch (e) { }
}

window.addEventListener("hashchange", checkAndNotifyContext);
window.addEventListener("popstate", checkAndNotifyContext);
setInterval(() => {
    checkAndNotifyContext();
    injectPUNotedVersionFooter();
}, 1000);
checkAndNotifyContext();
observeChangelogBuffers();


const INGAME_SCRIPT_MAP = {
    corpContracts: 'corp-contracts.js',
    contractEnhancements: 'contract.js',
    cxlEnhancements: 'cxl.js',
    hubInventory: 'hubinventory.js'
};

const injectedFeatureScripts = {};

function toggleFeatureScripts(settings) {
    if (!settings) return;

    // Ensure materials-map is always injected first if any feature script needs it
    const needsMaterialsMap = settings.corpContracts === true || settings.contractEnhancements === true;
    const existingMap = document.getElementById('punoted-feature-materials-map');
    if (needsMaterialsMap && !existingMap) {
        const sm = document.createElement('script');
        sm.id = 'punoted-feature-materials-map';
        sm.src = chrome.runtime.getURL('materials-map.js');
        (document.head || document.documentElement).appendChild(sm);
    }

    for (const [key, scriptFile] of Object.entries(INGAME_SCRIPT_MAP)) {
        const isEnabled = settings[key] === true;
        const existingScript = document.getElementById(`punoted-feature-${key}`);
        if (isEnabled && !existingScript) {
            const s = document.createElement('script');
            s.id = `punoted-feature-${key}`;
            s.src = chrome.runtime.getURL(scriptFile);
            (document.head || document.documentElement).appendChild(s);
            injectedFeatureScripts[key] = s;
        } else if (!isEnabled && existingScript) {
            existingScript.remove();
            delete injectedFeatureScripts[key];
        }
    }
}

async function syncIngameUiSettings() {
    try {
        // Fast path: read directly from local storage so theme and scripts apply instantly with zero lag
        const stored = await chrome.storage.local.get(['ingameUiSettings']);
        const settings = stored?.ingameUiSettings;
        if (settings) {
            applyCustomApexTheme(settings.customTheme === true);
            toggleFeatureScripts(settings);
            window.postMessage({ type: 'prun-ingame-ui-settings', settings }, '*');
        } else {
            // Fallback via background message if not in storage yet
            const bgSettings = await chrome.runtime.sendMessage({ type: 'GET_INGAME_UI_SETTINGS' });
            if (bgSettings) {
                applyCustomApexTheme(bgSettings.customTheme === true);
                toggleFeatureScripts(bgSettings);
                window.postMessage({ type: 'prun-ingame-ui-settings', settings: bgSettings }, '*');
            }
        }
    } catch (e) { }
}

chrome.runtime.onMessage.addListener((message) => {
    if (message && message.type === 'INGAME_UI_SETTINGS_UPDATED' && message.settings) {
        applyCustomApexTheme(message.settings.customTheme === true);
        toggleFeatureScripts(message.settings);
        window.postMessage({ type: 'prun-ingame-ui-settings', settings: message.settings }, '*');
    }
});

async function initializeContentScript() {
    try {
        const timeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Login status check timed out.')), LOGIN_TIMEOUT_MS);
        });

        const response = await Promise.race([
            chrome.runtime.sendMessage({ type: 'GET_LOGIN_STATUS' }),
            timeout
        ]);

        isUserLoggedIn = !!response.isLoggedIn;
        loginStatusConfirmed = true;

        if (isUserLoggedIn) {
            await fetchMessageTypeSettings();
            await syncIngameUiSettings();
            for (const message of messageBuffer) processMessage(message);
            if (localMessageQueue.length > 0) flushLocalQueueToBackground();
        } else {
            await syncIngameUiSettings();
        }
        messageBuffer = [];
    } catch (error) {
        console.error('[PrUn WS Forwarder Content] Failed to get login status:', error);
        loginStatusConfirmed = true;
        syncIngameUiSettings();
        messageBuffer = [];
    }
}

// Run UI settings sync immediately at document load so theme & features persist across page refresh
syncIngameUiSettings();
initializeContentScript();

setInterval(() => {
    try {
        if (chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ type: 'PING' }).catch(() => { });
        }
    } catch (e) {
        // Ignore extension context invalidated errors during reloads
    }
}, 20000);

function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

const HARDCODED_ADMIN_ONLY_MESSAGE_TYPES = [
    "WORLD_MATERIAL_DATA",
    "WORLD_REACTOR_DATA",
    "COUNTRY_REGISTRY_COUNTRIES",
    "WORLD_MATERIAL_CATEGORIES",
    "WORLD_SECTORS",
    "SIMULATION_DATA",
    "SYSTEM_STARS_DATA",
]; // This is for Admin only Data

function shouldSendMessageType(messageType) {
    if ((currentMessageTypeSettingsAlwaysSend && currentMessageTypeSettingsAlwaysSend.includes(messageType)) || (messageType && messageType.startsWith("SHIP_ROUTES_")) || HARDCODED_ADMIN_ONLY_MESSAGE_TYPES.includes(messageType)) return true;
    if (Object.keys(currentMessageTypeSettings).length === 0) {
        // Settings not loaded. Conservative choice: allow messages of always-send types, otherwise allow by default
        return true;
    }
    if (currentMessageTypeSettings.hasOwnProperty(messageType)) return currentMessageTypeSettings[messageType] === true;

    //console.log(`[PrUn WS Forwarder Content] Skipped processing ${messageType}: not in allowed message types.`) -> Logging all of these messages would clutter the devconsole and possibly slow down the website

    return false;
}

function processMessage(message) {
    if (!isUserLoggedIn) return;
    if (!message || !message.messageType) return;

    let processedPayload = message;

    if (processedPayload.messageType === "ACTION_COMPLETED") {
        if (message?.payload?.message) {
            processedPayload = {
                ...message.payload.message,
                context: message.context
            };
        } else {
            return;
        }
    }

    if (!processedPayload.payload) return;

    const clonedPayload = JSON.parse(JSON.stringify(processedPayload.payload));

    // Capture accounting cash balances and trade orders locally for offline briefing
    try {
        if (processedPayload.messageType === "ACCOUNTING_CASH_BALANCES") {
            const balances = Array.isArray(clonedPayload) ? clonedPayload : (clonedPayload.balances || []);
            const icaAcc = balances.find(b => b.currency === "ICA" || b.balancecurrencycode === "ICA");
            if (icaAcc && typeof icaAcc.amount === "number") {
                capturedCurrentCash = icaAcc.amount;
            }
        } else if (processedPayload.messageType === "COMEX_TRADER_ORDERS") {
            const orders = Array.isArray(clonedPayload) ? clonedPayload : (clonedPayload.orders || []);
            orders.forEach(o => {
                if (o.status === "FULFILLED" || o.amount === 0) {
                    const createdTs = o.created ? (typeof o.created === "number" ? o.created : new Date(o.created).getTime()) : 0;
                    // If order was created/active around or after last known online time
                    if (!lastKnownOnlineTime || createdTs >= (lastKnownOnlineTime - 86400000)) {
                        if (!capturedFulfilledOrders.some(x => x.orderid === o.orderId || x.orderid === o.id)) {
                            capturedFulfilledOrders.push({
                                orderid: o.orderId || o.id,
                                type: (o.type || "TRADE").toUpperCase(),
                                ticker: o.material?.ticker || o.materialTicker || o.ticker || "Material",
                                amount: o.initialAmount || o.amount || 0,
                                price: o.limit?.amount ? Number(o.limit.amount).toFixed(2) : (o.limitAmount || 0),
                                currency: o.limit?.currency || o.limitCurrency || "ICA"
                            });
                        }
                    }
                }
            });
        } else if (processedPayload.messageType === "SHIP_SHIPS" || processedPayload.messageType === "SHIP_DATA") {
            const shipList = Array.isArray(clonedPayload) ? clonedPayload : (clonedPayload.ships || (clonedPayload.id ? [clonedPayload] : []));
            if (shipList.length > 0) {
                let inFlight = 0;
                let inPort = 0;
                shipList.forEach(s => {
                    if (s.flightId) {
                        inFlight++;
                    } else {
                        inPort++;
                    }
                });
                capturedFleetStatus = {
                    total: shipList.length,
                    inFlight: inFlight,
                    inPort: inPort
                };
            }
        }
    } catch (e) { }

    const itemToQueue = {
        id: generateUniqueId(),
        context: message.context,
        message: {
            messageType: processedPayload.messageType,
            payload: clonedPayload,
            context: processedPayload.context
        },
    };

    console.log(`[PrUn WS Forwarder Content] Received message of type ${itemToQueue.message.messageType}`);

    if (!shouldSendMessageType(itemToQueue.message.messageType)) return;

    console.log(`[PrUn WS Forwarder Content] Processed ${itemToQueue.message.messageType}`)

    localMessageQueue.push(itemToQueue);

    if (flushTimeout) clearTimeout(flushTimeout);
    flushTimeout = setTimeout(flushLocalQueueToBackground, FLUSH_DEBOUNCE_MS);
}

let isFlushing = false;

function flushLocalQueueToBackground() {
    if (flushTimeout) {
        clearTimeout(flushTimeout);
        flushTimeout = null;
    }

    // Don't flush if queue is empty or if we are already in the middle of a flush
    if (localMessageQueue.length === 0 || isFlushing) return;

    isFlushing = true;
    const messagesToSend = localMessageQueue.slice(); // Copy the current queue

    try {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({
                type: "PRUN_DATA_CAPTURED_BATCH",
                payload: messagesToSend,
            }).then(response => {
                isFlushing = false;

                if (response && response.success) {
                    // Woke up successfully and queued the data! Remove them from local memory.
                    if (Array.isArray(response.successfullyQueuedIds) && response.successfullyQueuedIds.length > 0) {
                        localMessageQueue = localMessageQueue.filter(item => !response.successfullyQueuedIds.includes(item.id));
                    }
                    isUserLoggedIn = !!response.isUserLoggedIn;

                    // Trigger offline briefing once initial sync data has landed
                    triggerOfflineBriefingIfEligible();
                } else {
                    // The background rejected it. Keep in queue and retry.
                    isUserLoggedIn = !!response?.isUserLoggedIn;
                    setTimeout(flushLocalQueueToBackground, 2000);
                }
            }).catch(error => {
                // Do nothing. Keep data in the queue, wait 2 seconds, and try to wake it up again.
                isFlushing = false;
                setTimeout(flushLocalQueueToBackground, 2000);
            });
        } else {
            isFlushing = false;
        }
    } catch (e) {
        isFlushing = false;
        setTimeout(flushLocalQueueToBackground, 2000);
    }
}

window.addEventListener("pagehide", function () {
    if (flushTimeout) {
        clearTimeout(flushTimeout);
        flushTimeout = null;
    }
    // Do not silently drop queued messages on pagehide. Keep them in memory for this session.
    if (windowMessageListener) window.removeEventListener("message", windowMessageListener);
});

// Inject decoder and injected script
const decoderScript = document.createElement("script");
decoderScript.src = chrome.runtime.getURL("prun-message-decoder.js");
decoderScript.type = "module";
(document.head || document.documentElement).appendChild(decoderScript);

decoderScript.onload = function () {
    const injectedScript = document.createElement("script");
    injectedScript.src = chrome.runtime.getURL("injected-script.js");
    injectedScript.type = "module";
    (document.head || document.documentElement).appendChild(injectedScript);

    injectedScript.onload = function () {
        decoderScript.remove();
        injectedScript.remove();
    };
    injectedScript.onerror = function (e) {
        console.error("[PrUn WS Forwarder Content] Failed to load injected-script.js:", e);
    };
};
decoderScript.onerror = function (e) {
    console.error("[PrUn WS Forwarder Content] Failed to load prun-message-decoder.js:", e);
};
