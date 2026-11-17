/**
 * offline-briefing.js
 * Injects a native-themed APEX "While You Were Away" briefing modal
 * and in-game Activity Stats Widget.
 */

(function () {
    const MODAL_ID = 'punoted-offline-briefing-modal';

    function formatDuration(seconds) {
        if (!seconds || seconds <= 0) return '0m';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    }

    function createBriefingModal(data) {
        if (document.getElementById(MODAL_ID)) return;

        const {
            offlineSeconds = 0,
            activeTodaySeconds = 0,
            openTodaySeconds = 0,
            fulfilledOrdersCount = 0,
            fulfilledOrders = [],
            financialChange = 0,
            currency = 'ICA',
            fleetStatus = { total: 0, inFlight: 0, inPort: 0 }
        } = data;

        const overlay = document.createElement('div');
        overlay.id = MODAL_ID;
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
        overlay.style.backdropFilter = 'blur(6px)';
        overlay.style.webkitBackdropFilter = 'blur(6px)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '999999';

        const modal = document.createElement('div');
        modal.style.width = '520px';
        modal.style.maxWidth = '90vw';
        modal.style.borderRadius = '8px';
        modal.style.border = '1px solid rgba(123, 104, 238, 0.45)';
        modal.style.background = 'linear-gradient(135deg, rgba(12, 12, 30, 0.98) 0%, rgba(6, 6, 16, 0.98) 100%)';
        modal.style.boxShadow = '0 16px 50px rgba(0, 0, 0, 0.9), 0 0 25px rgba(123, 104, 238, 0.35)';
        modal.style.overflow = 'hidden';
        modal.style.fontFamily = 'inherit';
        modal.style.color = '#e2e8f0';

        // Header
        const header = document.createElement('div');
        header.style.background = 'linear-gradient(135deg, rgba(26, 26, 60, 0.98) 0%, rgba(14, 14, 36, 0.98) 100%)';
        header.style.borderBottom = '1px solid rgba(123, 104, 238, 0.35)';
        header.style.padding = '10px 16px';
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.justifyContent = 'space-between';

        const titleBox = document.createElement('div');
        titleBox.style.display = 'flex';
        titleBox.style.alignItems = 'center';
        titleBox.style.gap = '8px';

        const badge = document.createElement('span');
        badge.textContent = 'PUNOTED BRIEFING';
        badge.style.fontSize = '10px';
        badge.style.fontWeight = '800';
        badge.style.letterSpacing = '0.08em';
        badge.style.background = 'rgba(123, 104, 238, 0.25)';
        badge.style.color = '#c084fc';
        badge.style.border = '1px solid rgba(192, 132, 252, 0.4)';
        badge.style.padding = '2px 6px';
        badge.style.borderRadius = '4px';

        const title = document.createElement('span');
        title.textContent = 'While You Were Away';
        title.style.fontWeight = '700';
        title.style.fontSize = '14px';
        title.style.color = '#f8fafc';

        titleBox.appendChild(badge);
        titleBox.appendChild(title);

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.background = 'none';
        closeBtn.style.border = 'none';
        closeBtn.style.color = '#a78bfa';
        closeBtn.style.fontSize = '20px';
        closeBtn.style.lineHeight = '1';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.padding = '0 4px';
        closeBtn.onclick = () => overlay.remove();

        header.appendChild(titleBox);
        header.appendChild(closeBtn);

        // Body Content
        const body = document.createElement('div');
        body.style.padding = '16px';
        body.style.display = 'flex';
        body.style.flexDirection = 'column';
        body.style.gap = '14px';

        // Away Banner
        const awayBanner = document.createElement('div');
        awayBanner.style.background = 'rgba(123, 104, 238, 0.1)';
        awayBanner.style.border = '1px solid rgba(123, 104, 238, 0.25)';
        awayBanner.style.borderRadius = '6px';
        awayBanner.style.padding = '10px 14px';
        awayBanner.style.display = 'flex';
        awayBanner.style.justifyContent = 'space-between';
        awayBanner.style.alignItems = 'center';

        const awayLabel = document.createElement('div');
        const awayText = offlineSeconds > 0 ? formatDuration(offlineSeconds) : 'Current Session';
        awayLabel.innerHTML = `<span style="color: #94a3b8; font-size: 12px; display: block;">Offline Duration</span>` +
            `<span style="color: #38bdf8; font-size: 16px; font-weight: 700;">${awayText}</span>`;

        const todayLabel = document.createElement('div');
        todayLabel.style.textAlign = 'right';
        todayLabel.innerHTML = `<span style="color: #94a3b8; font-size: 12px; display: block;">In-Game Today</span>` +
            `<span style="color: #4ade80; font-size: 14px; font-weight: 700;">${formatDuration(activeTodaySeconds)} active</span>` +
            `<span style="color: #64748b; font-size: 11px; margin-left: 6px;">(${formatDuration(openTodaySeconds)} open)</span>`;

        awayBanner.appendChild(awayLabel);
        awayBanner.appendChild(todayLabel);
        body.appendChild(awayBanner);

        // Key Stats Cards Grid
        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = '1fr 1fr';
        grid.style.gap = '10px';

        // Fleet Status Card
        const fleetCard = document.createElement('div');
        fleetCard.style.background = 'rgba(18, 18, 38, 0.8)';
        fleetCard.style.border = '1px solid rgba(123, 104, 238, 0.2)';
        fleetCard.style.borderRadius = '6px';
        fleetCard.style.padding = '10px';

        const hasFleet = (fleetStatus.total || 0) > 0;
        fleetCard.innerHTML = `
            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Fleet Status</div>
            <div style="font-size: 18px; font-weight: 700; color: #f1f5f9;">
                ${hasFleet ? fleetStatus.total : '—'} 
                <span style="font-size: 12px; font-weight: 400; color: #64748b;">ships</span>
            </div>
            <div style="display: flex; gap: 8px; font-size: 11px; margin-top: 4px;">
                <span style="color: #38bdf8;">✈ ${fleetStatus.inFlight || 0} in flight</span>
                <span style="color: #94a3b8;">⚓ ${fleetStatus.inPort || 0} in port</span>
            </div>
        `;

        // Financial Net / Orders Card
        const finCard = document.createElement('div');
        finCard.style.background = 'rgba(18, 18, 38, 0.8)';
        finCard.style.border = '1px solid rgba(123, 104, 238, 0.2)';
        finCard.style.borderRadius = '6px';
        finCard.style.padding = '10px';

        const isPositive = financialChange >= 0;
        const color = isPositive ? '#4ade80' : '#f87171';
        const sign = isPositive ? '+' : '';

        finCard.innerHTML = `
            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Trade & Cashflow</div>
            <div style="font-size: 18px; font-weight: 700; color: ${color};">${sign}${financialChange.toLocaleString()} <span style="font-size: 12px; font-weight: 400; color: #64748b;">${currency}</span></div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
                ${fulfilledOrdersCount} orders filled
            </div>
        `;

        grid.appendChild(fleetCard);
        grid.appendChild(finCard);
        body.appendChild(grid);

        // Fulfilled Orders Breakdown List (if any)
        if (fulfilledOrders.length > 0) {
            const listContainer = document.createElement('div');
            listContainer.style.background = 'rgba(10, 10, 24, 0.6)';
            listContainer.style.border = '1px solid rgba(123, 104, 238, 0.15)';
            listContainer.style.borderRadius = '6px';
            listContainer.style.padding = '8px 10px';
            listContainer.style.maxHeight = '140px';
            listContainer.style.overflowY = 'auto';

            let listHtml = `<div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px; font-weight: 600;">RECENT COMPLETED ORDERS:</div>`;
            fulfilledOrders.slice(0, 5).forEach(o => {
                const actionColor = o.type === 'BUY' || o.type === 'BUYING' ? '#38bdf8' : '#f59e0b';
                listHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <span><b style="color: ${actionColor};">${o.type}</b> ${o.amount}x ${o.ticker}</span>
                        <span style="color: #cbd5e1;">@ ${o.price} ${o.currency || 'ICA'}</span>
                    </div>
                `;
            });
            listContainer.innerHTML = listHtml;
            body.appendChild(listContainer);
        }

        // Action Buttons Footer
        const footer = document.createElement('div');
        footer.style.display = 'flex';
        footer.style.justifyContent = 'space-between';
        footer.style.alignItems = 'center';
        footer.style.marginTop = '6px';

        // Checkbox: Do not show automatically on login
        const toggleLabel = document.createElement('label');
        toggleLabel.style.display = 'inline-flex';
        toggleLabel.style.alignItems = 'center';
        toggleLabel.style.gap = '6px';
        toggleLabel.style.fontSize = '11px';
        toggleLabel.style.color = '#94a3b8';
        toggleLabel.style.cursor = 'pointer';

        const toggleCheckbox = document.createElement('input');
        toggleCheckbox.type = 'checkbox';
        toggleCheckbox.style.cursor = 'pointer';
        toggleCheckbox.style.accentColor = '#7b68ee';
        toggleCheckbox.onchange = (e) => {
            try {
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.set({ punoted_briefing_disabled: e.target.checked });
                }
            } catch (err) { }
        };

        const toggleText = document.createElement('span');
        toggleText.textContent = "Don't show on login";

        toggleLabel.appendChild(toggleCheckbox);
        toggleLabel.appendChild(toggleText);

        const dismissBtn = document.createElement('button');
        dismissBtn.textContent = 'Dismiss';
        dismissBtn.style.background = 'linear-gradient(135deg, rgba(123, 104, 238, 0.8) 0%, rgba(99, 102, 241, 0.8) 100%)';
        dismissBtn.style.color = '#ffffff';
        dismissBtn.style.border = 'none';
        dismissBtn.style.borderRadius = '4px';
        dismissBtn.style.padding = '6px 16px';
        dismissBtn.style.fontWeight = '600';
        dismissBtn.style.fontSize = '12px';
        dismissBtn.style.cursor = 'pointer';
        dismissBtn.style.transition = 'all 0.15s ease';
        dismissBtn.onclick = () => overlay.remove();

        footer.appendChild(toggleLabel);
        footer.appendChild(dismissBtn);
        body.appendChild(footer);

        modal.appendChild(header);
        modal.appendChild(body);
        overlay.appendChild(modal);

        document.body.appendChild(overlay);
    }

    // Expose to window so content script can call it
    window.__PUNOTED_SHOW_OFFLINE_BRIEFING = createBriefingModal;
})();
