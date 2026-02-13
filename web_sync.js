// web_sync.js
(function() {
    const WEB_TOKEN_KEY = 'authToken'; 
    let syncInProgress = false;

    async function checkAndSync() {
        if (syncInProgress) return;

        // 1. Ask the background script if we actually need a token
        chrome.runtime.sendMessage({ type: 'GET_LOGIN_STATUS' }, (response) => {
            // If the extension is already logged in, do nothing
            if (response && response.isLoggedIn) {
                return; 
            }

            // 2. If not logged in, check localStorage for a web token
            const webToken = localStorage.getItem(WEB_TOKEN_KEY);
            if (webToken) {
                syncInProgress = true;
                chrome.runtime.sendMessage({
                    type: 'SYNC_FROM_WEB',
                    payload: { token: webToken }
                }, () => {
                    syncInProgress = false;
                });
            }
        });
    }

    // Check when page loads
    checkAndSync();

    // Check when user interacts (in case they just clicked 'Login')
    window.addEventListener('click', checkAndSync);
    
    // Low-frequency heartbeat (every 60s) to catch background logouts
    setInterval(checkAndSync, 60000);
})();