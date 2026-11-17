document.addEventListener('DOMContentLoaded', async () => {
  // Sections
  const loginSection = document.getElementById('login-section');
  const registerSection = document.getElementById('register-section');
  const verifyEmailSection = document.getElementById('verify-email-section');
  const dashboardSection = document.getElementById('dashboard-section');
  const settingsSection = document.getElementById('settings-section');

  // Forms
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const verifyEmailForm = document.getElementById('verify-email-form');

  // Message boxes
  const loginMessage = document.getElementById('login-message');
  const registerMessage = document.getElementById('register-message');
  const verifyEmailMessage = document.getElementById('verify-email-message');

  // Dashboard elements
  const dashboardUsername = document.getElementById('dashboard-username');
  const currentContextDisplay = document.getElementById('current-context-display');
  const successfulSentCountEl = document.getElementById('successful-sent-count');
  const queueCountDisplay = document.getElementById('queue-count');
  const todayActivityDisplay = document.getElementById('today-activity-display');

  // Controls
  const logoutButton = document.getElementById('logout-button');
  const consentPuDebug = document.getElementById('consent-pu-debug');
  const queueRemoveButton = document.getElementById('queue-remove-button');

  // Links / nav
  const showRegisterLink = document.getElementById('show-register');
  const showLoginLink = document.getElementById('show-login');
  const resendCodeLink = document.getElementById('resend-code');
  const backToLoginFromVerifyLink = document.getElementById('back-to-login-from-verify');
  const showVerifyEmailFromLoginLink = document.getElementById('show-verify-email-from-login');
  const showSettingsFromDashboardLink = document.getElementById('show-settings-from-dashboard');
  const showSettingsFromLoginLink = document.getElementById('show-settings-from-login');
  const backToDashboardFromSettingsLink = document.getElementById('back-to-dashboard-from-settings');

  // Settings UI
  const messageTypeSettingsContainer = document.getElementById('message-type-settings-container');
  const saveSettingsButton = document.getElementById('save-settings-button');

  let statsIntervalId = null;
  let onMessageListener = null;

  const ingameUiSettingsSection = document.getElementById('ingame-ui-settings-section');
  const showIngameUiSettingsFromDashboardLink = document.getElementById('show-ingame-ui-settings-from-dashboard');
  const backToDashboardFromIngameUiLink = document.getElementById('back-to-dashboard-from-ingame-ui');
  const ingameUiSettingsContainer = document.getElementById('ingame-ui-settings-container');
  const saveIngameUiSettingsButton = document.getElementById('save-ingame-ui-settings-button');

  function createTempMessageBox() {
    const el = document.createElement('div');
    el.className = 'message-box';
    return el;
  }

  function showMessage(el, text, type = 'info') {
    if (!el) return;
    el.textContent = text;
    el.className = `message-box visible ${type}`;
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => el.classList.remove('visible'), 3000);
  }

  const devSettingsSection = document.getElementById('dev-settings-section');
  const devMenuToggleBtn = document.getElementById('dev-menu-toggle-btn');
  const devEnvToggleCheckbox = document.getElementById('dev-env-toggle-checkbox');
  const backFromDevSettingsBtn = document.getElementById('back-from-dev-settings-btn');
  const envModeBadge = document.getElementById('env-mode-badge');
  const devServerUrlDisplay = document.getElementById('dev-server-url-display');
  const devDataUrlDisplay = document.getElementById('dev-data-url-display');
  const devWebsiteUrlDisplay = document.getElementById('dev-website-url-display');

  let activeSectionBeforeDev = 'login-section';

  async function fetchAndDisplayEnvSettings() {
    try {
      const res = await chrome.runtime.sendMessage({ type: 'GET_ENV_MODE' });
      if (res) {
        const isDev = res.currentEnv === 'dev';
        if (devEnvToggleCheckbox) devEnvToggleCheckbox.checked = isDev;
        if (envModeBadge) {
          envModeBadge.textContent = isDev ? 'DEV (LOCALHOST)' : 'PROD (REMOTE)';
          envModeBadge.style.background = isDev ? 'rgba(239, 68, 68, 0.3)' : 'rgba(123, 104, 238, 0.3)';
          envModeBadge.style.borderColor = isDev ? 'rgba(239, 68, 68, 0.6)' : 'rgba(123, 104, 238, 0.6)';
        }
        if (devServerUrlDisplay) devServerUrlDisplay.textContent = res.config?.SERVER_URL || '-';
        if (devDataUrlDisplay) devDataUrlDisplay.textContent = res.config?.DATA_SERVER_URL || '-';
        if (devWebsiteUrlDisplay) devWebsiteUrlDisplay.textContent = res.config?.WEBSITE_URL || '-';
      }
    } catch (e) {}
  }

  function hideAllSections() {
    loginSection?.classList.add('hidden');
    registerSection?.classList.add('hidden');
    verifyEmailSection?.classList.add('hidden');
    dashboardSection?.classList.add('hidden');
    settingsSection?.classList.add('hidden');
    ingameUiSettingsSection?.classList.add('hidden');
    devSettingsSection?.classList.add('hidden');
  }

  function showSection(id) {
    const currentVisible = [loginSection, registerSection, verifyEmailSection, dashboardSection, settingsSection, ingameUiSettingsSection].find(s => s && !s.classList.contains('hidden'));
    if (currentVisible && currentVisible.id !== 'dev-settings-section') {
      activeSectionBeforeDev = currentVisible.id;
    }
    hideAllSections();
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('hidden');
    if (id === 'settings-section') fetchAndDisplayMessageSettings();
    if (id === 'ingame-ui-settings-section') fetchAndDisplayIngameUiSettings();
    if (id === 'dev-settings-section') fetchAndDisplayEnvSettings();
  }

  function updateStatusPair(indicatorEl, textEl, reachable, text) {
    if (!indicatorEl || !textEl) return;
    const pill = indicatorEl.closest('.status-pill') || indicatorEl;
    if (reachable) {
      pill.classList.remove('status-offline');
      pill.classList.add('status-online');
      textEl.textContent = text || 'Online';
    } else {
      pill.classList.remove('status-online');
      pill.classList.add('status-offline');
      textEl.textContent = text || 'Offline';
    }
  }

  function updateAllStatusDisplays(reachable, text) {
    const indicators = Array.from(document.querySelectorAll('[id^="server-status-indicator"]'));
    indicators.forEach(ind => {
      const textId = ind.id.replace('indicator', 'text');
      let textEl = document.getElementById(textId);
      if (!textEl) {
        const parent = ind.parentElement;
        if (parent) textEl = parent.querySelector('span[id$="text"]') || parent.querySelector('span:not([id])');
      }
      updateStatusPair(ind, textEl, reachable, text);
    });
  }

  // Persist stats locally so popup shows them instantly next open
  async function persistStatsLocally(successfulSentCount, queueCount) {
    try {
      await chrome.storage.local.set({
        successfulSentCount: Number(successfulSentCount) || 0,
        messagesInQueueCount: Number(queueCount) || 0
      });
    } catch (e) { /* ignore */ }
  }

  function updateContextBadge(ctx) {
    if (!currentContextDisplay) return;
    const val = ctx || 'COMPANY';
    currentContextDisplay.textContent = val;
    currentContextDisplay.className = 'context-badge';
    if (val === 'GOVERNMENT') {
      currentContextDisplay.classList.add('context-government');
    } else if (val === 'ADMINCENTER') {
      currentContextDisplay.classList.add('context-admincenter');
    } else {
      currentContextDisplay.classList.add('context-company');
    }
  }

  async function loadPersistedStatsAndStatus() {
    try {
      const stored = await chrome.storage.local.get(['successfulSentCount','messagesInQueueCount','serverReachable','lastServerCheck','currentContext']);
      const sent = stored.successfulSentCount ?? 0;
      const queued = stored.messagesInQueueCount ?? 0;
      successfulSentCountEl && (successfulSentCountEl.textContent = sent);
      queueCountDisplay && (queueCountDisplay.textContent = queued);
      updateContextBadge(stored.currentContext);
      if (typeof stored.serverReachable === 'boolean') {
        updateAllStatusDisplays(!!stored.serverReachable, stored.serverReachable ? 'Online' : 'Offline');
      } else {
        updateAllStatusDisplays(false, 'Checking...');
      }
    } catch (e) {
      updateAllStatusDisplays(false, 'Checking...');
    }
  }

  async function updateDashboardStats() {
    try {
      const res = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
      if (res) {
        successfulSentCountEl && (successfulSentCountEl.textContent = res.successfulSentCount ?? 0);
        queueCountDisplay && (queueCountDisplay.textContent = res.queueCount ?? 0);
        updateContextBadge(res.currentContext);
        updateAllStatusDisplays(!!res.serverReachable, res.serverReachable ? 'Online' : 'Offline');
        await persistStatsLocally(res.successfulSentCount ?? 0, res.queueCount ?? 0);
      }

      // Read activity stats
      const today = new Date().toISOString().split('T')[0];
      chrome.storage.local.get(['punoted_activity_stats'], (data) => {
        const stats = data.punoted_activity_stats?.[today] || { active_seconds: 0, open_seconds: 0 };
        const activeMins = Math.round(stats.active_seconds / 60);
        const openMins = Math.round(stats.open_seconds / 60);
        if (todayActivityDisplay) {
          if (activeMins >= 60) {
            const h = (activeMins / 60).toFixed(1);
            todayActivityDisplay.textContent = `${h}h (${openMins}m open)`;
          } else {
            todayActivityDisplay.textContent = `${activeMins}m active`;
          }
        }
      });
    } catch (err) {
      updateAllStatusDisplays(false, 'Error');
    }
  }

  async function checkLoginStatus() {
    try {
      const res = await chrome.runtime.sendMessage({ type: 'CHECK_AUTH_STATUS' });
      if (res && res.loggedIn) {
        showSection('dashboard-section');
        dashboardUsername && (dashboardUsername.textContent = res.username || '');
        consentPuDebug && (consentPuDebug.checked = !!res.puDebugEnabled);
        showSettingsFromLoginLink?.classList.remove('hidden');

        await loadPersistedStatsAndStatus();
        if (statsIntervalId) clearInterval(statsIntervalId);
        await updateDashboardStats();
        statsIntervalId = setInterval(updateDashboardStats, 2000);
      } else {
        showSection('login-section');
        showSettingsFromLoginLink?.classList.add('hidden');
        if (statsIntervalId) { clearInterval(statsIntervalId); statsIntervalId = null; }
        await loadPersistedStatsAndStatus();
        await updateDashboardStats();
      }
    } catch (err) {
      showSection('login-section');
      updateAllStatusDisplays(false, 'Error');
    }
  }

  async function getAuthState() {
    const stored = await chrome.storage.local.get(['auth_token', 'username', 'auth_token_expires_at']);
    const now = Math.floor(Date.now() / 1000);
    const loggedIn = !!stored.auth_token && (!stored.auth_token_expires_at || stored.auth_token_expires_at > now);
    return {
      loggedIn,
      username: stored.username || null
    };
  }

  async function fetchAndDisplayMessageSettings() {
    if (!messageTypeSettingsContainer) return;
    messageTypeSettingsContainer.innerHTML = '<p class="text-gray-500 text-sm">Loading settings...</p>';
    try {
      const settings = await chrome.runtime.sendMessage({ type: 'GET_MESSAGE_TYPE_SETTINGS' });
      messageTypeSettingsContainer.innerHTML = '';
      if (settings && Object.keys(settings).length) {
        const keys = Object.keys(settings).sort();
        for (const k of keys) {
          const isEnabled = settings[k];
          const label = document.createElement('label');
          label.className = 'flex justify-between text-gray-300 py-0.5 text-xs'; // replaced inline styles
          label.innerHTML = `
            <span class="flex-grow-1 text-ellipsis">${k.replace(/_/g,' ')}</span>
            <label class="toggle-switch"><input type="checkbox" data-message-type="${k}" ${isEnabled ? 'checked' : ''}><span class="slider"></span></label>
          `;
          messageTypeSettingsContainer.appendChild(label);
        }
      } else {
        messageTypeSettingsContainer.innerHTML = '<p class="text-red-400 text-sm">No message types found.</p>';
      }
    } catch (err) {
      messageTypeSettingsContainer.innerHTML = '<p class="text-red-400 text-sm">Error loading settings.</p>';
    }
  }

  async function saveMessageSettings() {
    if (!messageTypeSettingsContainer) return;
    const updated = {};
    const cbs = messageTypeSettingsContainer.querySelectorAll('input[type="checkbox"]');
    cbs.forEach(cb => { updated[cb.dataset.messageType] = cb.checked; });
    const tmp = createTempMessageBox();
    showMessage(tmp, 'Saving settings...', 'info');
    try {
      const res = await chrome.runtime.sendMessage({ type: 'SET_MESSAGE_TYPE_SETTINGS', payload: updated });
      if (res && res.success) showMessage(tmp, 'Settings saved.', 'success');
      else showMessage(tmp, res?.message || 'Save failed', 'error');
    } catch (err) { showMessage(tmp, 'Error saving settings.', 'error'); }
  }

  const INGAME_UI_FEATURE_LABELS = {
    customTheme: 'Custom Dark APEX Window Styling',
    offlineBriefing: 'Show "While You Were Away" Briefing on Login',
    corpContracts: 'Corporation Contracts Badge',
    contractEnhancements: 'Contract Enhancements & Tags',
    cxlEnhancements: 'CXL Enhancements',
    hubInventory: 'Hub Inventory Overview'
  };

  async function fetchAndDisplayIngameUiSettings() {
    if (!ingameUiSettingsContainer) return;
    ingameUiSettingsContainer.innerHTML = '<p class="text-gray-500 text-sm">Loading UI settings...</p>';
    try {
      const settings = await chrome.runtime.sendMessage({ type: 'GET_INGAME_UI_SETTINGS' });
      ingameUiSettingsContainer.innerHTML = '';
      if (settings && Object.keys(settings).length) {
        for (const [key, labelText] of Object.entries(INGAME_UI_FEATURE_LABELS)) {
          const isEnabled = settings[key] === true; // default false if unconfigured
          const label = document.createElement('label');
          label.className = 'flex justify-between text-gray-300 py-1 text-xs';
          label.style.display = 'flex';
          label.style.justifyContent = 'space-between';
          label.style.alignItems = 'center';
          label.style.padding = '4px 0';
          label.innerHTML = `
            <span style="font-size: 0.8rem; font-weight: 500;">${labelText}</span>
            <label class="toggle-switch"><input type="checkbox" data-ingame-feature="${key}" ${isEnabled ? 'checked' : ''}><span class="slider"></span></label>
          `;
          ingameUiSettingsContainer.appendChild(label);
        }
      } else {
        ingameUiSettingsContainer.innerHTML = '<p class="text-red-400 text-sm">No UI features found.</p>';
      }
    } catch (err) {
      ingameUiSettingsContainer.innerHTML = '<p class="text-red-400 text-sm">Error loading UI settings.</p>';
    }
  }

  async function saveIngameUiSettings() {
    if (!ingameUiSettingsContainer) return;
    const updated = {};
    const cbs = ingameUiSettingsContainer.querySelectorAll('input[type="checkbox"]');
    cbs.forEach(cb => { updated[cb.dataset.ingameFeature] = cb.checked; });
    const tmp = createTempMessageBox();
    showMessage(tmp, 'Saving UI preferences...', 'info');
    try {
      const res = await chrome.runtime.sendMessage({ type: 'SET_INGAME_UI_SETTINGS', payload: updated });
      if (res && res.success) showMessage(tmp, 'UI preferences saved.', 'success');
      else showMessage(tmp, res?.message || 'Save failed', 'error');
    } catch (err) { showMessage(tmp, 'Error saving UI preferences.', 'error'); }
  }

  // Event handlers
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const usernameVal = (loginForm.username?.value || '').trim();
    const passwordVal = loginForm.password?.value || '';
    showMessage(loginMessage, 'Logging in...', 'info');
    loginMessage.classList?.remove('hidden')

    try {
      const res = await chrome.runtime.sendMessage({ type: 'LOGIN', payload: { username: usernameVal, password: passwordVal } });

      if (res && res.success) {
        dashboardUsername && (dashboardUsername.textContent = res.username || usernameVal);
        showSection('dashboard-section');
        updateAllStatusDisplays(true, 'Online');
        if (statsIntervalId) clearInterval(statsIntervalId);
        await updateDashboardStats();
        statsIntervalId = setInterval(updateDashboardStats, 2000);
        showMessage(loginMessage, 'Login successful', 'success');
        return;
      }

      if (res?.needs_email_verification && res?.email) {
        showMessage(loginMessage, res.message || 'Email verification required', 'warning');
        const v = document.getElementById('verify-email-input');
        if (v) v.value = res.email;
        showSection('verify-email-section');

        return;
      }

      showMessage(loginMessage, res?.message || 'Login failed', 'error');
    } catch (err) {
      showMessage(loginMessage, 'Login error. Check connection.', 'error');
    }
  });

  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const usernameVal = (registerForm.username?.value || '').trim();
    const emailVal = (registerForm['register-email']?.value || '').trim();
    const passwordVal = registerForm.password?.value || '';
    showMessage(registerMessage, 'Registering...', 'info');
    try {
      const res = await chrome.runtime.sendMessage({ type: 'REGISTER', payload: { username: usernameVal, email: emailVal, password: passwordVal } });
      if (res && res.success) {
        showMessage(registerMessage, res.message || 'Registered', 'success');
        registerForm.reset();
        const v = document.getElementById('verify-email-input');
        if (v) v.value = emailVal;
        showSection('verify-email-section');
      } else showMessage(registerMessage, res?.message || 'Registration failed', 'error');
    } catch (err) { showMessage(registerMessage, 'Registration error', 'error'); }
  });

  verifyEmailForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (verifyEmailForm['verify-email-input']?.value || '').trim();
    const code = (verifyEmailForm['verification-code']?.value || '').trim();
    showMessage(verifyEmailMessage, 'Verifying...', 'info');
    try {
      const res = await chrome.runtime.sendMessage({ type: 'VERIFY_EMAIL', payload: { email, code } });
      if (res && res.success) { showMessage(verifyEmailMessage, res.message || 'Verified', 'success'); verifyEmailForm.reset(); showSection('login-section'); }
      else showMessage(verifyEmailMessage, res?.message || 'Verification failed', 'error');
    } catch (err) { showMessage(verifyEmailMessage, 'Verification error', 'error'); }
  });

  logoutButton?.addEventListener('click', async () => {
    try {
      const res = await chrome.runtime.sendMessage({ type: 'LOGOUT' });
      loginMessage.classList?.remove('hidden')
      if (res && res.success) {
        showMessage(loginMessage, 'Logged out', 'info');
        await checkLoginStatus();
      } else showMessage(loginMessage, 'Logout failed', 'error');
    } catch (err) { showMessage(loginMessage, 'Logout error', 'error'); }
  });

  queueRemoveButton?.addEventListener('click', async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'QUEUEREMOVE' });
      await updateDashboardStats();
      showMessage(createTempMessageBox(), 'Queue cleared', 'success');
    } catch (err) { showMessage(createTempMessageBox(), 'Failed to clear queue', 'error'); }
  });

  consentPuDebug?.addEventListener('change', async (e) => {
    const enabled = !!e.target.checked;
    try { await chrome.runtime.sendMessage({ type: 'SET_PU_DEBUG_CONSENT', payload: { enabled } }); } catch (err) {}
  });

  showRegisterLink?.addEventListener('click', (e) => { e.preventDefault(); showSection('register-section'); });
  showLoginLink?.addEventListener('click', (e) => { e.preventDefault(); showSection('login-section'); });
  resendCodeLink?.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = (document.getElementById('verify-email-input')?.value || '').trim();
    if (!email) { showMessage(verifyEmailMessage, 'Enter email', 'warning'); return; }
    showMessage(verifyEmailMessage, 'Resending...', 'info');
    try {
      const res = await chrome.runtime.sendMessage({ type: 'RESEND_VERIFICATION_CODE', payload: { email } });
      showMessage(verifyEmailMessage, res?.message || 'Done', res?.success ? 'success' : 'error');
    } catch (err) { showMessage(verifyEmailMessage, 'Resend error', 'error'); }
  });

  backToLoginFromVerifyLink?.addEventListener('click', (e) => { e.preventDefault(); showSection('login-section'); });
  showVerifyEmailFromLoginLink?.addEventListener('click', (e) => { e.preventDefault(); showSection('verify-email-section'); });

  showSettingsFromDashboardLink?.addEventListener('click', (e) => { e.preventDefault(); showSection('settings-section'); });
  showSettingsFromLoginLink?.addEventListener('click', (e) => { e.preventDefault(); showSection('settings-section'); });
  backToDashboardFromSettingsLink?.addEventListener('click', (e) => { e.preventDefault(); showSection('dashboard-section'); });
  saveSettingsButton?.addEventListener('click', saveMessageSettings);

  showIngameUiSettingsFromDashboardLink?.addEventListener('click', (e) => { e.preventDefault(); showSection('ingame-ui-settings-section'); });
  backToDashboardFromIngameUiLink?.addEventListener('click', (e) => { e.preventDefault(); showSection('dashboard-section'); });
  saveIngameUiSettingsButton?.addEventListener('click', saveIngameUiSettings);

  devMenuToggleBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (devSettingsSection?.classList.contains('hidden')) {
      showSection('dev-settings-section');
    } else {
      showSection(activeSectionBeforeDev || 'login-section');
    }
  });

  backFromDevSettingsBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    showSection(activeSectionBeforeDev || 'login-section');
  });

  devEnvToggleCheckbox?.addEventListener('change', async (e) => {
    const envMode = e.target.checked ? 'dev' : 'prod';
    try {
      const res = await chrome.runtime.sendMessage({ type: 'SET_ENV_MODE', payload: { envMode } });
      if (res && res.success) {
        await fetchAndDisplayEnvSettings();
        updateAllStatusDisplays(!!res.serverReachable, res.serverReachable ? 'Online' : 'Offline');
      }
    } catch (err) {}
  });

  // Listen for background push updates
  onMessageListener = (msg) => {
    if (!msg || !msg.type) return;
    if (msg.type === 'SERVER_STATUS_UPDATED') {
      updateAllStatusDisplays(!!msg.serverReachable, msg.serverReachable ? 'Online' : 'Offline');
      updateDashboardStats();
    }
    if (msg.type === 'AUTH_STATUS_UPDATED') {
      checkLoginStatus();
    }
  };
  chrome.runtime.onMessage.addListener(onMessageListener);

  await loadPersistedStatsAndStatus();

  try {
    const forced = await chrome.runtime.sendMessage({ type: 'FORCE_SERVER_CHECK' });
    updateAllStatusDisplays(!!forced.serverReachable, forced.serverReachable ? 'Online' : 'Offline');
  } catch (e) {}

  await checkLoginStatus();

  window.addEventListener('unload', () => {
    if (statsIntervalId) clearInterval(statsIntervalId);
    try { if (onMessageListener) chrome.runtime.onMessage.removeListener(onMessageListener); } catch (e) {}
  });
});
