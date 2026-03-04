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
        if (loginStatusConfirmed) {
            processMessage(message);
        } else {
            messageBuffer.push(message);
        }
    }
}

window.addEventListener("message", windowMessageListener);

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
            for (const message of messageBuffer) processMessage(message);
            if (localMessageQueue.length > 0) flushLocalQueueToBackground();
        }
        messageBuffer = [];
    } catch (error) {
        console.error('[PrUn WS Forwarder Content] Failed to get login status:', error);
        loginStatusConfirmed = true;
        messageBuffer = [];
    }
}

initializeContentScript();

setInterval(() => {
    try {
        if (chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ type: 'PING' }).catch(() => {});
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
    if (currentMessageTypeSettingsAlwaysSend && currentMessageTypeSettingsAlwaysSend.includes(messageType) || HARDCODED_ADMIN_ONLY_MESSAGE_TYPES.includes(messageType)) return true;
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

    const itemToQueue = {
        id: generateUniqueId(),
        context: message.context,
        message: {
            messageType: processedPayload.messageType,
            payload: clonedPayload,
            context: processedPayload.context
        },
    };

    
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

window.addEventListener("unload", function() {
    if (flushTimeout) {
        clearTimeout(flushTimeout);
        flushTimeout = null;
    }
    // Do not silently drop queued messages on unload. Keep them in memory for this session.
    if (windowMessageListener) window.removeEventListener("message", windowMessageListener);
});

// Inject decoder and injected script
const decoderScript = document.createElement("script");
decoderScript.src = chrome.runtime.getURL("prun-message-decoder.js");
decoderScript.type = "module";
(document.head || document.documentElement).appendChild(decoderScript);

decoderScript.onload = function() {
    const injectedScript = document.createElement("script");
    injectedScript.src = chrome.runtime.getURL("injected-script.js");
    injectedScript.type = "module";
    (document.head || document.documentElement).appendChild(injectedScript);

    injectedScript.onload = function() {
        decoderScript.remove();
        injectedScript.remove();
    };
    injectedScript.onerror = function(e) {
        console.error("[PrUn WS Forwarder Content] Failed to load injected-script.js:", e);
    };
};
decoderScript.onerror = function(e) {
    console.error("[PrUn WS Forwarder Content] Failed to load prun-message-decoder.js:", e);
};
