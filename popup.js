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
  const successfulSentCountEl = document.getElementById('successful-sent-count');
  const queueCountDisplay = document.getElementById('queue-count');

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

  function hideAllSections() {
    loginSection?.classList.add('hidden');
    registerSection?.classList.add('hidden');
    verifyEmailSection?.classList.add('hidden');
    dashboardSection?.classList.add('hidden');
    settingsSection?.classList.add('hidden');
  }

  function showSection(id) {
    hideAllSections();
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('hidden');
    if (id === 'settings-section') fetchAndDisplayMessageSettings();
  }

  function updateStatusPair(indicatorEl, textEl, reachable, text) {
    if (!indicatorEl || !textEl) return;
    if (reachable) {
      indicatorEl.classList.remove('status-offline');
      indicatorEl.classList.add('status-online');
      textEl.textContent = text || 'Online';
    } else {
      indicatorEl.classList.remove('status-online');
      indicatorEl.classList.add('status-offline');
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

  async function loadPersistedStatsAndStatus() {
    try {
      const stored = await chrome.storage.local.get(['successfulSentCount','messagesInQueueCount','serverReachable','lastServerCheck']);
      const sent = stored.successfulSentCount ?? 0;
      const queued = stored.messagesInQueueCount ?? 0;
      successfulSentCountEl && (successfulSentCountEl.textContent = sent);
      queueCountDisplay && (queueCountDisplay.textContent = queued);
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
        updateAllStatusDisplays(!!res.serverReachable, res.serverReachable ? 'Online' : 'Offline');
        await persistStatsLocally(res.successfulSentCount ?? 0, res.queueCount ?? 0);
      }
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
