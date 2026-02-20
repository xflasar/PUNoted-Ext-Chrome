const SERVER_URL = 'https://api.punoted.net/auth';
const DATA_SERVER_URL = 'https://api.punoted.net';
const WEBSITE_URL = 'https://punoted.net';

const MAX_BATCH_SIZE = 10;
const QUEUE_DB_NAME = 'prunDataQueue';
const QUEUE_STORE_NAME = 'dataItems';
const MIN_INTERVAL = 500;
const MAX_INTERVAL = 10000;

// Unique Header for Server Identification
const EXTENSION_HEADER = { 'X-Extension-Client': 'PrunDataExtension-Chrome' };

let lastSuccessfulRequestTime = 0;
let lastRequestDuration = 0;
let currentBatchInterval = 1000;
let statusCheckerIntervalId = null;
let batchRunning = null;
let isSending = false;

// Core state variables
let auth_token = null;
let username = null;
let auth_token_expires_at = null;
let puDebugEnabled = false;
let successfulSentCount = 0;
let messagesInQueueCount = 0;
let serverReachable = false;
let consecutiveFailureCount = 0;
let messageTypeSettings = {};

const HARDCODED_IGNORED_MESSAGE_TYPES = [
  "SYSTEM_TRAFFIC_SHIP", "CHANNEL_DATA", "CHANNEL_UNSEEN_MESSAGES_COUNT", "TUTORIAL_TUTORIALS",
  "ALERTS_ALERTS", "UI_STACKS_STACKS", "UI_DATA", "CHANNEL_USER_LIST", "CHANNEL_MESSAGE_LIST",
  "PRESENCE_LIST", "FCM_SUBSCRIPTION_UPDATE", "SYSTEM_DATA_UPDATED", "PLANET_DATA_UPDATED",
  "LEADERBOARD_UPDATED", "NOTIFICATIONS_CONFIG", "SYSTEM_TRAFFIC", "ALERTS_ALERT",
  "CONTRACT_DRAFTS_DRAFTS", "CONTRACTS_PARTNERS", "CHANNEL_CLIENT_MEMBERSHIP",
  "COMEX_TICKER_INVALID", "SHIP_FLIGHT_MISSION", "CHANNEL_STARTED_TYPING",
  "CHANNEL_STOPPED_TYPING", "CHANNEL_MESSAGE_ADDED", "UI_SCREENS_SET_STATE",
  "ALERTS_ALERTS_DELETED", "CHANNEL_USER_LEFT", "CONTRACT_DRAFTS_DRAFT",
  "CORPORATION_MANAGER_INVITE", "CORPORATION_MANAGER_INVITES", "CHANNEL_MESSAGE_DELETED",
  "UI_TILES_REMOVE", "UI_TILES_CHANGE_SIZE", "CHANNEL_USER_JOINED",
  "SYSTEM_TRAFFIC_SHIP_REMOVED"
];

const HARDCODED_ALWAYS_SEND_MESSAGE_TYPES = [
  "USER_DATA", "COMPANY_DATA", "SITE_SITES", "STORAGE_STORAGES", "WAREHOUSE_STORAGES",
  "SHIP_SHIPS", "WORKFORCE_WORKFORCES"
];

const HARDCODED_ADMIN_ONLY_MESSAGE_TYPES = [
  "WORLD_MATERIAL_DATA", "WORLD_REACTOR_DATA", "COUNTRY_REGISTRY_COUNTRIES",
  "WORLD_MATERIAL_CATEGORIES", "WORLD_SECTORS", "SIMULATION_DATA", "SYSTEM_STARS_DATA",
];

const USER_CONTROLLABLE_MESSAGE_TYPES_DEFAULTS = {
  "STORAGE_CHANGE": true, "WORKFORCE_CHANGE": true, "ACTION_COMPLETED": true,
  "DATA_DATA": true, "ACCOUNTING_CASH_BALANCES": true, "CORPORATION_SHAREHOLDER_HOLDINGS": true,
  "SHIP_FLIGHT_FLIGHTS": true, "CONTRACTS_CONTRACTS": true, "PLANET_DATA": true,
  "PRODUCTION_SITE_PRODUCTION_LINES": true, "COMEX_TRADER_ORDERS": true,
  "POPULATION_AVAILABLE_RESERVE_WORKFORCE": true, "FOREX_TRADER_ORDERS": true,
  "SHIPYARD_PROJECTS": true, "BLUEPRINT_BLUEPRINTS": true, "PRODUCTION_ORDER_REMOVED": true,
  "PRODUCTION_ORDER_UPDATED": true, "ACCOUNTING_BOOKINGS": true, "PRODUCTION_ORDER_ADDED": true,
  "COMEX_EXCHANGE_BROKER_LIST": true, "COMEX_BROKER_DATA": true, "DATA_AGGREGATION_DATA": true,
  "PRODUCTION_PRODUCTION_LINES": true, "EXPERTS_EXPERTS": true, "CORPORATION_DATA": true,
  "CORPORATION_PROJECTS_DATA": true, "SHIP_FLIGHT_FLIGHT_ENDED": true, "SHIP_DATA": true,
  "SHIP_FLIGHT_FLIGHT": true, "COMEX_TRADER_ORDER_DELETION_TERMS": true,
  "COMEX_TRADER_ORDER_REMOVED": true, "SITE_NO_SITE": true, "AUTH_AUTHENTICATED": true,
  "SITE_SITE": true, "USER_STARTING_PROFILE_DATA": true, "PRODUCTION_PRODUCTION_LINE_UPDATED": true,
  "WORKFORCE_WORKFORCES_UPDATED": true, "SITE_PLATFORM_UPDATED": true, "COUNTRY_AGENT_DATA": true,
  "CONTRACTS_CONTRACT": true, "COMEX_TRADER_ORDER_UPDATED": true, "COMEX_TRADER_ORDER_ADDED": true,
  "LEADERBOARD_SCORES": true, "COMEX_BROKER_NEW_PRICE": true, "COMEX_BROKER_PRICES": true,
  "ACCOUNTING_BALANCES": true, "ACCOUNTING_CASH_BOOKINGS": true, "WAREHOUSE_STORAGE": true,
  "SITE_PLATFORM_BUILT": true, "ADMIN_CENTER_CLIENT_VOTING_DATA": true, "SHIPYARD_PROJECT": true,
  "BLUEPRINT_BLUEPRINT": true, "STORAGE_REMOVED": true, "SERVER_CONNECTION_OPENED": true
};

let initializationPromise;
let resolveInitializationPromise;
initializationPromise = new Promise(resolve => { resolveInitializationPromise = resolve; });

// ---------- Compression Helper ----------
async function compressData(dataString) {
  const stream = new Blob([dataString]).stream();
  const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
  return await new Response(compressedStream).arrayBuffer();
}

// ---------- IndexedDB helpers ----------
function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(QUEUE_DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE_NAME)) {
        db.createObjectStore(QUEUE_STORE_NAME, { autoIncrement: true });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function addToIndexedDB(item) {
  const db = await openDb();
  const tx = db.transaction([QUEUE_STORE_NAME], 'readwrite');
  const store = tx.objectStore(QUEUE_STORE_NAME);
  item._ts = Date.now();
  return new Promise((res, rej) => {
    const r = store.add(item);
    r.onsuccess = () => { messagesInQueueCount++; res(); };
    r.onerror = async (e) => {
      if (e.target.error.name === "QuotaExceededError") {
        await removeOldestMessages(10);
        try { await addToIndexedDB(item); res(); } catch (err) { rej(err); }
      } else rej(e.target.error);
    };
  });
}

async function clearIndexedDB(keys) {
  if (!keys || keys.length === 0) return;
  const db = await openDb();
  const tx = db.transaction([QUEUE_STORE_NAME], 'readwrite');
  const store = tx.objectStore(QUEUE_STORE_NAME);
  const ops = keys.map(k => new Promise((res, rej) => {
    const r = store.delete(k);
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  }));
  await Promise.all(ops);
  await updateQueueCountFromDb();
}

async function wipeIndexedDB() {
  const db = await openDb();
  const tx = db.transaction([QUEUE_STORE_NAME], 'readwrite');
  const store = tx.objectStore(QUEUE_STORE_NAME);
  return new Promise((res, rej) => {
    const r = store.clear();
    r.onsuccess = () => { updateQueueCountFromDb().then(res).catch(res); };
    r.onerror = () => rej(r.error);
  });
}

async function updateQueueCountFromDb() {
  const db = await openDb();
  const tx = db.transaction([QUEUE_STORE_NAME], 'readonly');
  const store = tx.objectStore(QUEUE_STORE_NAME);
  return new Promise((res) => {
    const r = store.count();
    r.onsuccess = () => { messagesInQueueCount = r.result; res(); };
    r.onerror = () => { messagesInQueueCount = 0; res(); };
  });
}

async function removeOldestMessages(count) {
  const db = await openDb();
  const tx = db.transaction([QUEUE_STORE_NAME], 'readwrite');
  const store = tx.objectStore(QUEUE_STORE_NAME);
  const itemsToDelete = [];
  await new Promise((resolve, reject) => {
    const cursorRequest = store.openCursor(null, 'next');
    cursorRequest.onsuccess = (evt) => {
      const cursor = evt.target.result;
      if (cursor && itemsToDelete.length < count) {
        itemsToDelete.push(cursor.key);
        cursor.continue();
      } else resolve();
    };
    cursorRequest.onerror = (e) => reject(e.target.error);
  });
  const deleteOps = itemsToDelete.map(k => new Promise((res, rej) => {
    const r = store.delete(k);
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  }));
  await Promise.all(deleteOps);
  await updateQueueCountFromDb();
}

// ---------- Server status persistence ----------
async function persistServerStatus(reachable) {
  serverReachable = !!reachable;
  const lastServerCheck = Date.now();
  try { await chrome.storage.local.set({ serverReachable, lastServerCheck }); } catch (e) { }
  try { chrome.runtime.sendMessage({ type: 'SERVER_STATUS_UPDATED', serverReachable, lastServerCheck }).catch(() => { }); } catch (e) { }
}

function stopStatusChecker() {
  if (statusCheckerIntervalId) { clearInterval(statusCheckerIntervalId); statusCheckerIntervalId = null; }
}

function startServerChecker() {
  if (statusCheckerIntervalId) return;
  statusCheckerIntervalId = setInterval(checkServerStatus, 10000);
}

async function checkServerStatus() {
  try {
    const response = await fetch(`${DATA_SERVER_URL}/status`, { method: 'GET', cache: 'no-store' });
    if (response.ok) {
      await persistServerStatus(true);
      stopStatusChecker();
      if (messagesInQueueCount > 0 && !batchRunning) startBatchSender();
    } else await persistServerStatus(false);
  } catch (e) { await persistServerStatus(false); }
}

// ---------- Auth Logic ----------

async function syncWithWebToken(webToken) {
  try {
    const res = await fetch(`${SERVER_URL}/extension_sync`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${webToken}`,
        ...EXTENSION_HEADER
      }
    });
    const data = await res.json();
    if (res.ok && data.success) {
      auth_token = data.token;
      username = data.username;
      auth_token_expires_at = data.expires_at;
      await chrome.storage.local.set({ auth_token, username, auth_token_expires_at });
      chrome.runtime.sendMessage({ type: 'AUTH_STATUS_UPDATED', loggedIn: true, username });
      await persistServerStatus(true);
      startBatchSender();
      return true;
    }
  } catch (e) { console.error("Sync failed", e); }
  return false;
}

async function registerUser(username_input, email_input, password_input) {
  try {
    const res = await fetch(`${SERVER_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...EXTENSION_HEADER },
      body: JSON.stringify({ username: username_input, email: email_input, password: password_input })
    });
    const data = await res.json();
    return res.ok ? { success: data.success, message: data.message } : { success: false, message: data.message || `Status ${res.status}` };
  } catch (e) { return { success: false, message: `Network: ${e.message}` }; }
}

async function verifyEmail(email_input, code_input) {
  try {
    const res = await fetch(`${SERVER_URL}/verify_email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...EXTENSION_HEADER },
      body: JSON.stringify({ email: email_input, code: code_input })
    });
    const data = await res.json();
    return res.ok ? { success: data.success, message: data.message } : { success: false, message: data.message || `Status ${res.status}` };
  } catch (e) { return { success: false, message: `Network: ${e.message}` }; }
}

async function resendVerificationCode(email_input) {
  try {
    const res = await fetch(`${SERVER_URL}/resend_verification_code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...EXTENSION_HEADER },
      body: JSON.stringify({ email: email_input })
    });
    const data = await res.json();
    return res.ok ? { success: data.success, message: data.message } : { success: false, message: data.message || `Status ${res.status}` };
  } catch (e) { return { success: false, message: `Network: ${e.message}` }; }
}

async function loginUser(username_input, password_input) {
  try {
    const res = await fetch(`${SERVER_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...EXTENSION_HEADER },
      body: JSON.stringify({ username: username_input, password: password_input })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      auth_token = data.token;
      username = data.username;
      auth_token_expires_at = data.expires_at;
      await chrome.storage.local.set({ auth_token, username, auth_token_expires_at });
      try { chrome.runtime.sendMessage({ type: 'AUTH_STATUS_UPDATED', loggedIn: true, username }).catch(() => { }); } catch (e) { }
      await persistServerStatus(true);
      startBatchSender();
      return { success: true, message: 'Logged in', username: data.username };
    }
    await persistServerStatus(false);
    return { success: false, message: data.message || `Status ${res.status}`, needs_email_verification: data?.needs_email_verification, email: data?.email };
  } catch (e) {
    await persistServerStatus(false);
    return { success: false, message: `Network: ${e.message}` };
  }
}

async function logoutUser() {
  auth_token = null; username = null; auth_token_expires_at = null;
  await chrome.storage.local.remove(['auth_token', 'username', 'auth_token_expires_at']);
  try { chrome.runtime.sendMessage({ type: 'AUTH_STATUS_UPDATED', loggedIn: false }).catch(() => { }); } catch (e) { }
  stopBatchSender();
  return { success: true };
}

async function restoreAuthState(force = false) {
  try {
    const stored = await chrome.storage.local.get(['auth_token', 'username', 'auth_token_expires_at', 'puDebugEnabled', 'messageTypeSettings', 'serverReachable']);
    if (force || !auth_token) {
      auth_token = stored.auth_token || null;
      username = stored.username || null;
      auth_token_expires_at = stored.auth_token_expires_at || null;
      puDebugEnabled = stored.puDebugEnabled || false;
      const savedSettings = stored.messageTypeSettings || {};
      messageTypeSettings = {};
      for (const k in USER_CONTROLLABLE_MESSAGE_TYPES_DEFAULTS) {
        messageTypeSettings[k] = savedSettings.hasOwnProperty(k) ? savedSettings[k] : USER_CONTROLLABLE_MESSAGE_TYPES_DEFAULTS[k];
      }
      if (typeof stored.serverReachable === 'boolean') serverReachable = stored.serverReachable;
    }
  } catch (e) {
    auth_token = null; username = null; auth_token_expires_at = null; puDebugEnabled = false;
    messageTypeSettings = { ...USER_CONTROLLABLE_MESSAGE_TYPES_DEFAULTS };
  }
}

// ---------- Batch sender with Gzip ----------
async function sendBatch() {
  if (isSending) return;
  isSending = true;

  await restoreAuthState();

  if (!auth_token || !username) { isSending = false; await updateQueueCountFromDb(); return; }

  const now = Math.floor(Date.now() / 1000);
  if (auth_token_expires_at && auth_token_expires_at <= now) {
    auth_token = null; username = null; auth_token_expires_at = null;
    await chrome.storage.local.remove(['auth_token', 'username', 'auth_token_expires_at']);
    isSending = false; await updateQueueCountFromDb(); return;
  }

  if (!serverReachable) { isSending = false; return; }

  let itemsToSend = [], keysInBatch = [];
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const db = await openDb();
    const tx = db.transaction([QUEUE_STORE_NAME], 'readwrite');
    const store = tx.objectStore(QUEUE_STORE_NAME);
    const cursorRequest = store.openCursor();

    await new Promise((resolve, reject) => {
      cursorRequest.onsuccess = (evt) => {
        const cursor = evt.target.result;
        if (cursor) {
          const item = cursor.value;
          const messageType = item?.message?.messageType;
          if (item && item.message && typeof messageType === 'string' &&
            messageType.length > 0 && item.message.payload &&
            typeof item.message.payload === 'object' &&
            Object.keys(item.message.payload).length > 0) {
            itemsToSend.push(item);
            keysInBatch.push(cursor.key);
            if (itemsToSend.length >= MAX_BATCH_SIZE) { resolve(); return; }
          } else { cursor.delete(); }
          cursor.continue();
        } else resolve();
      };
      cursorRequest.onerror = (e) => reject(e.target.error);
    });

    if (itemsToSend.length === 0) { clearTimeout(timeoutId); isSending = false; return; }

    const url = `${DATA_SERVER_URL}/data_batch?conn=${encodeURIComponent(username)}`;
    const rawData = JSON.stringify({ data: itemsToSend });
    let body = rawData;
    let headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth_token}`,
      ...EXTENSION_HEADER
    };

    if (rawData.length > 2048) {
      body = await compressData(rawData);
      headers['Content-Encoding'] = 'gzip';
    }

    const start = Date.now();
    const res = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body,
      signal: controller.signal
    });
    const end = Date.now();
    lastRequestDuration = end - start;

    if (res.ok) {
      lastSuccessfulRequestTime = end;
      consecutiveFailureCount = 0;
      await persistServerStatus(true);
      successfulSentCount += itemsToSend.length;
      await clearIndexedDB(keysInBatch);

      const responseData = await res.json();
      if (responseData.new_token && responseData.new_expires_at) {
        auth_token = responseData.new_token; auth_token_expires_at = responseData.new_expires_at;
        await chrome.storage.local.set({ auth_token, auth_token_expires_at });
      }
    } else if (res.status === 400 || res.status === 408 || res.status === 413) {
      console.error(
				`[Sync] Server returned ${res.status}. Clearing malformed batch.`,
			);
			const keysToClear = allItems.slice(0, itemsProcessed).map((i) => i.key);
			await clearIndexedDB(keysToClear);

			setTimeout(runBatch, 1000);
    } else if (res.status === 401) {
      await restoreAuthState(true);
      await logoutUser();
      await persistServerStatus(false);
    } else {
      consecutiveFailureCount++;
      await persistServerStatus(false);
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      consecutiveFailureCount++;
      await persistServerStatus(false);
    }
  } finally {
    clearTimeout(timeoutId);
    isSending = false;
    await updateQueueCountFromDb();
  }
}

// ---------- Batch loop ----------
function startBatchSender() {
  if (batchRunning) return;
  batchRunning = true;
  const loop = async () => {
    if (!batchRunning) return;
    if (!serverReachable) { stopBatchSender(); startServerChecker(); return; }
    if (messagesInQueueCount >= MAX_BATCH_SIZE && !isSending) await sendBatch();
    else {
      const since = Date.now() - lastSuccessfulRequestTime;
      if (messagesInQueueCount > 0 && since >= currentBatchInterval && !isSending) await sendBatch();
    }
    if (messagesInQueueCount > 50) currentBatchInterval = MIN_INTERVAL;
    else if (lastRequestDuration > 2000) currentBatchInterval = Math.min(MAX_INTERVAL, currentBatchInterval * 2);
    else currentBatchInterval = Math.max(MIN_INTERVAL, currentBatchInterval * 0.9);
    if (batchRunning) setTimeout(loop, currentBatchInterval);
  };
  loop();
}

function stopBatchSender() { batchRunning = null; }

// ---------- Messaging Handler Logic ----------
async function handleMessage(request, sender) {
  // --- INSTANT RESPONSE LOGIC (No Await) ---
  const now = Math.floor(Date.now() / 1000);
  const isCurrentlyLoggedIn = !!auth_token && (!auth_token_expires_at || auth_token_expires_at > now);

  if (request.type === 'SYNC_FROM_WEB') {
    // Only proceed if we don't have a token OR the current one is expired
    const now = Math.floor(Date.now() / 1000);
    const needsLogin = !auth_token || (auth_token_expires_at && auth_token_expires_at < now);

    if (needsLogin) {
      console.log("Detected web token, attempting background sync...");
      await syncWithWebToken(request.payload.token);
    }
    return { success: true }; // Tell the courier we received it
  }
  if (request.type === 'GET_LOGIN_STATUS') return { isLoggedIn: isCurrentlyLoggedIn };
  if (request.type === 'CHECK_AUTH_STATUS') return { loggedIn: isCurrentlyLoggedIn, username, puDebugEnabled };
  if (request.type === 'GET_STATS') return { successfulSentCount, queueCount: messagesInQueueCount, serverReachable };

  // --- HEAVY LOGIC (Await Initialization) ---
  await initializationPromise;

  const isFromContentScript = sender.tab && sender.tab.url && sender.tab.url.startsWith('https://apex.prosperousuniverse.com');

  if (isFromContentScript && request.type === 'PRUN_DATA_CAPTURED_BATCH') {
    if (!serverReachable) { if (!statusCheckerIntervalId) startServerChecker(); return { success: false, isUserLoggedIn: isCurrentlyLoggedIn, message: 'Server unreachable.' }; }
    const messagesToProcess = request.payload || [];
    const queuedIds = [];
    const promises = [];
    for (const msg of messagesToProcess) {
      const messageType = msg?.message?.messageType;
      let shouldSend = false;
      if (HARDCODED_ALWAYS_SEND_MESSAGE_TYPES.includes(messageType)) shouldSend = true;
      else if (HARDCODED_ADMIN_ONLY_MESSAGE_TYPES.includes(messageType)) shouldSend = true;
      else if (HARDCODED_IGNORED_MESSAGE_TYPES.includes(messageType)) shouldSend = false;
      else if (USER_CONTROLLABLE_MESSAGE_TYPES_DEFAULTS.hasOwnProperty(messageType)) shouldSend = messageTypeSettings[messageType] === true;
      else shouldSend = false;

      if (shouldSend && auth_token && username) {
        const p = addToIndexedDB(msg).then(() => queuedIds.push(msg.id)).catch(() => { });
        promises.push(p);
      }
    }
    await Promise.allSettled(promises);
    return { success: true, isUserLoggedIn: isCurrentlyLoggedIn, message: `Queued ${queuedIds.length}`, successfullyQueuedIds: queuedIds };
  }

  switch (request.type) {
    case 'GET_MESSAGE_TYPE_SETTINGS': return messageTypeSettings;
    case 'GET_MESSAGE_TYPE_SETTINGS_ALWAYS_SEND': return HARDCODED_ALWAYS_SEND_MESSAGE_TYPES;
    case 'SERVER_STATUS_SUBSCRIBE': return { serverReachable };
    case 'FORCE_SERVER_CHECK': try { await checkServerStatus(); return { serverReachable }; } catch (e) { return { serverReachable: false }; }
    case 'REGISTER': return registerUser(request.payload.username, request.payload.email, request.payload.password);
    case 'VERIFY_EMAIL': return verifyEmail(request.payload.email, request.payload.code);
    case 'RESEND_VERIFICATION_CODE': return resendVerificationCode(request.payload.email);
    case 'LOGIN': return loginUser(request.payload.username, request.payload.password);
    case 'LOGOUT': return logoutUser();
    case 'QUEUEREMOVE': await wipeIndexedDB(); return { success: true };
    case 'SET_PU_DEBUG_CONSENT': await setPuDebugCookie(request.payload.enabled); return { success: true };
    case 'SET_MESSAGE_TYPE_SETTINGS':
      for (const t in request.payload) {
        if (USER_CONTROLLABLE_MESSAGE_TYPES_DEFAULTS.hasOwnProperty(t)) messageTypeSettings[t] = request.payload[t];
      }
      try { await chrome.storage.local.set({ messageTypeSettings }); return { success: true, message: 'Settings updated.' }; }
      catch (error) { return { success: false, message: error.message }; }
    default: return false;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender)
    .then(response => sendResponse(response))
    .catch(err => sendResponse({ success: false, error: err.message }));
  return true; 
});

async function setPuDebugCookie(enabled) {
  puDebugEnabled = !!enabled;
  await chrome.storage.local.set({ puDebugEnabled });
  try {
    await chrome.cookies.set({
      url: 'https://apex.prosperousuniverse.com',
      name: 'pu-debug',
      value: puDebugEnabled ? 'true' : 'false',
      expirationDate: (Date.now() / 1000) + (365 * 24 * 60 * 60)
    });
  } catch (e) { }
}

async function initialize() {
  await restoreAuthState();
  await updateQueueCountFromDb();
  checkServerStatus().catch(() => { });
  if (auth_token && serverReachable) {
    startBatchSender();
  } else startServerChecker();
  resolveInitializationPromise();
}

// Installation Hook
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: WEBSITE_URL });
  }
});

initialize();