/**
 * PrUn Inventory Logistics - PUNoted UI (Modernized & Compact)
 * Architecture: Local Station Scraping + Reactive State + Native Compact Overlay + Clean Filters
 */
(() => {
	"use strict";

	async function getExtensionAuthContext() {
		return new Promise((resolve) => {
			const handler = (evt) => {
				if (evt.source === window && evt.data && evt.data.type === "prun-auth-token-response") {
					window.removeEventListener("message", handler);
					resolve({
						token: evt.data.token || null,
						currentEnv: evt.data.currentEnv || "prod",
						serverUrl: evt.data.serverUrl || "https://api.punoted.net",
					});
				}
			};
			window.addEventListener("message", handler);
			window.postMessage({ type: "prun-get-auth-token" }, "*");
			setTimeout(() => {
				window.removeEventListener("message", handler);
				resolve({
					token: null,
					currentEnv: "prod",
					serverUrl: "https://api.punoted.net",
				});
			}, 1500);
		});
	}

	// --- 1. API FETCHER ---
	async function fetchPlanetaryRequirements() {
		try {
			const authCtx = await getExtensionAuthContext();
			const baseApiUrl = authCtx.serverUrl || (authCtx.currentEnv === "dev" ? "http://localhost:9900" : "https://api.punoted.net");
			const headers = { Accept: "application/json" };
			if (authCtx.token) {
				headers["Authorization"] = `Bearer ${authCtx.token}`;
				headers["X-Data-Token"] = authCtx.token;
			}

			const response = await fetch(`${baseApiUrl}/v1/production/user/production/simple`, {
				method: "GET",
				headers,
			});

			if (!response.ok) {
				throw new Error(`HTTP Error: ${response.status}`);
			}

			return await response.json();
		} catch (error) {
			console.warn("[PUNoted Logistics] Production data fetch warning:", error.message);
			return {};
		}
	}

	// --- 2. LOCAL INVENTORY SCRAPER ---
	function scrapeInventory(gridNode) {
		const inventory = {};
		const items = gridNode.querySelectorAll('div[class*="GridItemView__container"]');

		items.forEach((item) => {
			const tickerNode = item.querySelector('span[class*="ColoredIcon__label"]');
			const amountNode = item.querySelector('div[class*="MaterialIcon__indicator"]');

			if (tickerNode && amountNode) {
				const ticker = tickerNode.textContent.trim();
				const amountText = amountNode.textContent.replace(/,/g, "").trim();

				let multiplier = 1;
				if (amountText.toLowerCase().endsWith("k")) multiplier = 1000;
				if (amountText.toLowerCase().endsWith("m")) multiplier = 1000000;

				const amount = (parseFloat(amountText.replace(/[a-zA-Z]/g, "")) || 0) * multiplier;

				if (!inventory[ticker]) {
					inventory[ticker] = {
						amount: 0,
					};
				}
				inventory[ticker].amount += amount;
			}
		});
		return inventory;
	}

	// --- 3. ALLOCATION & SURPLUS ENGINE ---
	function calculateLogistics(inventory, requirements, dispatchedBases) {
		let totalReserved = {};
		let displayAllocations = {};

		for (const ticker in inventory) totalReserved[ticker] = 0;

		for (const [planet, needs] of Object.entries(requirements)) {
			displayAllocations[planet] = {};
			const isDispatched = dispatchedBases.has(planet);

			for (const [ticker, reqAmount] of Object.entries(needs)) {
				const safeReq = Math.floor(reqAmount);
				displayAllocations[planet][ticker] = {
					required: safeReq,
					isDispatched,
				};

				if (!isDispatched) {
					totalReserved[ticker] = (totalReserved[ticker] || 0) + safeReq;
				}
			}
		}

		let itemStatus = {};
		let missingItems = [];
		let surplusCount = 0;

		for (const [ticker, data] of Object.entries(inventory)) {
			const reserved = totalReserved[ticker] || 0;
			const safeAmount = Math.floor(data.amount);

			const surplusAmt = Math.max(0, safeAmount - reserved);
			const missingAmt = Math.max(0, reserved - safeAmount);

			itemStatus[ticker] = {
				available: safeAmount,
				reserved,
				surplus: surplusAmt,
				missing: missingAmt,
				inGrid: true,
			};

			if (missingAmt > 0) {
				missingItems.push({ ticker, missing: missingAmt, required: reserved, available: safeAmount });
			}
			if (surplusAmt > 0) surplusCount++;
		}

		// Items required by bases but completely absent from this station inventory (0 in stock)
		for (const ticker in totalReserved) {
			if (!inventory[ticker] && totalReserved[ticker] > 0) {
				const missingAmt = totalReserved[ticker];
				itemStatus[ticker] = {
					available: 0,
					reserved: totalReserved[ticker],
					surplus: 0,
					missing: missingAmt,
					inGrid: false,
				};
				missingItems.push({ ticker, missing: missingAmt, required: totalReserved[ticker], available: 0 });
			}
		}

		return { displayAllocations, itemStatus, missingItems, surplusCount };
	}

	// --- 4. COMPACT APP CONTROLLER & VIEW ---
	let triggerAppRender = null;
	let renderDebounceTimeout = null;

	async function mountLogisticsApp(tileNode, gridNode, stationName) {
		if (tileNode.dataset.logisticsOn === "true") {
			tileNode.dataset.logisticsOn = "false";
			tileNode.querySelector(".pnt-compact-logistics-bar")?.remove();
			tileNode.querySelector(".pnt-missing-banner")?.remove();
			tileNode.querySelector(".pnt-compact-drawer")?.remove();
			gridNode.querySelectorAll(".pnt-clean-badge").forEach((b) => b.remove());
			gridNode.querySelectorAll('div[class*="GridItemView__container"]').forEach((el) => {
				el.style.opacity = "";
				el.style.filter = "";
			});
			triggerAppRender = null;
			return;
		}

		tileNode.dataset.logisticsOn = "true";
		const state = {
			inventory: {},
			requirements: {},
			dispatchedBases: new Set(),
			filterMode: "ALL", // "ALL" | "MISSING" | "SURPLUS"
			showBasesDrawer: false,
			isLoading: true,
		};

		// 1. COMPACT TOOLBAR
		const toolbar = document.createElement("div");
		toolbar.className = "pnt-compact-logistics-bar";
		toolbar.style.cssText = `
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 8px;
			padding: 4px 10px;
			background: linear-gradient(135deg, rgba(16, 16, 38, 0.98) 0%, rgba(9, 9, 22, 0.98) 100%);
			border-bottom: 1px solid rgba(123, 104, 238, 0.4);
			margin-bottom: 4px;
			font-family: inherit;
			font-size: 11px;
			color: #cbd5e1;
			user-select: none;
		`;

		// Missing Banner (shows missing items that have 0 in stock in station)
		const missingBanner = document.createElement("div");
		missingBanner.className = "pnt-missing-banner";
		missingBanner.style.cssText = `
			display: none;
			padding: 6px 10px;
			background: rgba(45, 12, 18, 0.95);
			border: 1px solid rgba(239, 68, 68, 0.4);
			border-radius: 4px;
			margin: 0 4px 6px 4px;
			font-size: 11px;
		`;

		// Bases Drawer
		const drawer = document.createElement("div");
		drawer.className = "pnt-compact-drawer";
		drawer.style.cssText = `
			display: none;
			padding: 8px 12px;
			background: rgba(10, 10, 24, 0.98);
			border-bottom: 1px solid rgba(123, 104, 238, 0.3);
			margin-bottom: 6px;
			font-size: 11px;
		`;

		gridNode.parentNode.insertBefore(toolbar, gridNode);
		gridNode.parentNode.insertBefore(missingBanner, gridNode);
		gridNode.parentNode.insertBefore(drawer, gridNode);

		const render = () => {
			if (state.isLoading) {
				toolbar.innerHTML = `
					<div style="display: flex; align-items: center; gap: 6px; color: #a78bfa; font-weight: 600;">
						<span style="display: inline-block; animation: spin 1s infinite linear;">↻</span> Loading Planetary Needs...
					</div>
				`;
				return;
			}

			const { displayAllocations, itemStatus, missingItems, surplusCount } = calculateLogistics(
				state.inventory,
				state.requirements,
				state.dispatchedBases
			);

			const baseCount = Object.keys(displayAllocations).length;
			const missingCount = missingItems.length;

			// Toolbar Button Styles
			const getBtnStyle = (active, activeBg, activeBorder, activeColor) => `
				background: ${active ? activeBg : "rgba(255, 255, 255, 0.05)"};
				border: 1px solid ${active ? activeBorder : "rgba(255, 255, 255, 0.12)"};
				color: ${active ? activeColor : "#94a3b8"};
				padding: 2px 9px;
				border-radius: 3px;
				cursor: pointer;
				font-size: 10px;
				font-weight: 600;
				letter-spacing: 0.3px;
				transition: all 0.15s ease;
			`;

			toolbar.innerHTML = `
				<div style="display: flex; align-items: center; gap: 6px;">
					<span style="color: #7b68ee; font-weight: 800; letter-spacing: 0.5px;">PUNoted Hub</span>
					<button id="pnt-filter-all" style="${getBtnStyle(state.filterMode === "ALL", "rgba(123, 104, 238, 0.35)", "#7b68ee", "#e9d5ff")}">ALL</button>
					<button id="pnt-filter-missing" style="${getBtnStyle(state.filterMode === "MISSING", "rgba(220, 38, 38, 0.35)", "#ef4444", "#fca5a5")}">
						MISSING <span style="color: ${missingCount > 0 ? '#f87171' : '#64748b'};">(${missingCount})</span>
					</button>
					<button id="pnt-filter-surplus" style="${getBtnStyle(state.filterMode === "SURPLUS", "rgba(123, 104, 238, 0.35)", "#a78bfa", "#d8b4fe")}">
						SURPLUS <span style="color: #c4b5fd;">(${surplusCount})</span>
					</button>
				</div>
				<div style="display: flex; align-items: center; gap: 6px;">
					<button id="pnt-btn-bases" style="${getBtnStyle(state.showBasesDrawer, "rgba(56, 189, 248, 0.25)", "#38bdf8", "#bae6fd")}">
						BASES (${baseCount}) ${state.showBasesDrawer ? "▲" : "▼"}
					</button>
				</div>
			`;

			// Render Missing Banner (especially helpful for items with 0 count in station)
			const zeroStockMissing = missingItems.filter(m => m.available === 0);
			if (zeroStockMissing.length > 0 && (state.filterMode === "MISSING" || state.filterMode === "ALL")) {
				missingBanner.style.display = "block";
				let bannerHtml = `
					<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
						<span style="color: #fca5a5; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
							Out of Stock at Station (${zeroStockMissing.length} needed by bases):
						</span>
					</div>
					<div style="display: flex; flex-wrap: wrap; gap: 6px;">
				`;
				zeroStockMissing.forEach(m => {
					bannerHtml += `
						<span style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(239, 68, 68, 0.5); padding: 1px 6px; border-radius: 3px; color: #f87171; font-weight: 600;">
							${m.ticker} <b style="color: #fff;">-${m.missing.toLocaleString()}</b>
						</span>
					`;
				});
				bannerHtml += `</div>`;
				missingBanner.innerHTML = bannerHtml;
			} else {
				missingBanner.style.display = "none";
			}

			// Render Drawer Content (Bases checklist)
			if (state.showBasesDrawer) {
				drawer.style.display = "block";
				let basesHtml = `
					<div style="margin-bottom: 6px; color: #94a3b8; font-size: 10px;">
						Check bases that are already dispatched/supplied to exclude their requirements:
					</div>
					<div style="display: flex; flex-wrap: wrap; gap: 6px;">
				`;
				for (const [planet, items] of Object.entries(displayAllocations)) {
					const isDispatched = state.dispatchedBases.has(planet);
					const reqCount = Object.keys(items).length;
					basesHtml += `
						<label style="display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 4px; background: ${isDispatched ? "rgba(255,255,255,0.03)" : "rgba(123, 104, 238, 0.15)"}; border: 1px solid ${isDispatched ? "rgba(255,255,255,0.08)" : "rgba(123, 104, 238, 0.4)"}; cursor: pointer; color: ${isDispatched ? "#64748b" : "#e2e8f0"}; transition: all 0.15s ease;">
							<input type="checkbox" class="pnt-base-chk" data-base="${planet}" ${isDispatched ? "checked" : ""} style="cursor: pointer; margin: 0;">
							<span style="font-weight: 600;">${planet}</span>
							<span style="font-size: 9px; color: ${isDispatched ? "#475569" : "#a78bfa"};">${reqCount} items [${isDispatched ? "DISPATCHED" : "PENDING"}]</span>
						</label>
					`;
				}
				basesHtml += `</div>`;
				drawer.innerHTML = basesHtml;
			} else {
				drawer.style.display = "none";
			}

			// Bind buttons
			toolbar.querySelector("#pnt-filter-all")?.addEventListener("click", () => {
				state.filterMode = "ALL";
				render();
			});
			toolbar.querySelector("#pnt-filter-missing")?.addEventListener("click", () => {
				state.filterMode = state.filterMode === "MISSING" ? "ALL" : "MISSING";
				render();
			});
			toolbar.querySelector("#pnt-filter-surplus")?.addEventListener("click", () => {
				state.filterMode = state.filterMode === "SURPLUS" ? "ALL" : "SURPLUS";
				render();
			});
			toolbar.querySelector("#pnt-btn-bases")?.addEventListener("click", () => {
				state.showBasesDrawer = !state.showBasesDrawer;
				render();
			});
			drawer.querySelectorAll(".pnt-base-chk").forEach((chk) => {
				chk.addEventListener("change", (e) => {
					const b = e.target.dataset.base;
					if (e.target.checked) state.dispatchedBases.add(b);
					else state.dispatchedBases.delete(b);
					render();
				});
			});

			// 2. INVENTORY GRID ITEM BADGES & FILTER HIGHLIGHTS
			gridNode.querySelectorAll('div[class*="GridItemView__container"]').forEach((item) => {
				const tickerNode = item.querySelector('span[class*="ColoredIcon__label"]');
				if (!tickerNode) return;

				const ticker = tickerNode.textContent.trim();
				const status = itemStatus[ticker];

				item.querySelectorAll(".pnt-clean-badge").forEach((b) => b.remove());
				if (!status) return;

				const isMissing = status.missing > 0;
				const isSurplus = status.surplus > 0;

				// Filter Dimming Logic
				if (state.filterMode === "MISSING") {
					if (isMissing) {
						item.style.opacity = "1";
						item.style.filter = "none";
						item.style.boxShadow = "0 0 8px rgba(239, 68, 68, 0.5)";
					} else {
						item.style.opacity = "0.15";
						item.style.filter = "grayscale(90%)";
						item.style.boxShadow = "none";
					}
				} else if (state.filterMode === "SURPLUS") {
					if (isSurplus) {
						item.style.opacity = "1";
						item.style.filter = "none";
						item.style.boxShadow = "0 0 8px rgba(123, 104, 238, 0.4)";
					} else {
						item.style.opacity = "0.15";
						item.style.filter = "grayscale(90%)";
						item.style.boxShadow = "none";
					}
				} else {
					item.style.opacity = "1";
					item.style.filter = "none";
					item.style.boxShadow = "";
				}

				const imageContainer = item.querySelector('div[class*="GridItemView__image"]');
				if (!imageContainer) return;

				imageContainer.style.position = "relative";

				const badge = document.createElement("div");
				badge.className = "pnt-clean-badge";
				badge.style.cssText = `
					position: absolute;
					top: 1px;
					right: 1px;
					z-index: 5;
					pointer-events: none;
					line-height: 10px;
				`;

				// Color coding:
				// Red for MISSING (critical)
				// PUNoted Theme Violet (#7b68ee / #a78bfa) with sharp readable typography for SURPLUS
				if (isMissing) {
					badge.innerHTML = `
						<span style="background: rgba(220, 38, 38, 0.95); color: #fff; padding: 1px 3px; border-radius: 2px; font-size: 8.5px; font-weight: 700; letter-spacing: -0.2px; border: 1px solid rgba(255, 255, 255, 0.4); box-shadow: 0 1px 3px rgba(0,0,0,0.6);">
							-${Math.floor(status.missing).toLocaleString()}
						</span>
					`;
				} else if (isSurplus && status.reserved > 0) {
					badge.innerHTML = `
						<span style="background: rgba(123, 104, 238, 0.9); color: #fff; padding: 1px 3px; border-radius: 2px; font-size: 8.5px; font-weight: 700; letter-spacing: -0.2px; border: 1px solid rgba(167, 139, 250, 0.5); box-shadow: 0 1px 3px rgba(0,0,0,0.6);">
							+${Math.floor(status.surplus).toLocaleString()}
						</span>
					`;
				} else if (isSurplus && status.reserved === 0) {
					badge.innerHTML = `
						<span style="background: rgba(30, 27, 75, 0.9); color: #c4b5fd; padding: 1px 3px; border-radius: 2px; font-size: 8px; font-weight: 700; letter-spacing: -0.2px; border: 1px solid rgba(123, 104, 238, 0.4);">
							SURP
						</span>
					`;
				}

				imageContainer.appendChild(badge);
			});
		};

		triggerAppRender = () => {
			state.inventory = scrapeInventory(gridNode);
			render();
		};

		state.requirements = await fetchPlanetaryRequirements();
		state.isLoading = false;
		triggerAppRender();
	}

	let isLogisticsEnabled = true;

	// --- 5. DOM MUTATION OBSERVER ---
	function observeStationInventories() {
		const observer = new MutationObserver(() => {
			if (!isLogisticsEnabled) return;
			document.querySelectorAll('div[class*="TileFrame__frame"]').forEach((tile) => {
				const cmdEl = tile.querySelector('div[class*="TileFrame__cmd"]');
				if (!cmdEl || !cmdEl.textContent.includes("INV")) return;

				const capacityNode = tile.querySelector('div[class*="StoreView__capacity"] span[class*="Link__link"]');
				if (!capacityNode) return;

				const stationName = capacityNode.textContent;
				if (!stationName.includes("Station")) return;

				if (tile.dataset.logisticsBtnInjected === "true") return;

				const sortControls = tile.querySelector('div[class*="InventorySortControls__controls"]');
				if (!sortControls) return;

				tile.dataset.logisticsBtnInjected = "true";
				tile.dataset.logisticsOn = "false";

				const btn = document.createElement("button");
				btn.className = "pnt-logistics-btn";
				btn.textContent = "PUNoted";
				btn.style.cssText = `
					background: rgba(123, 104, 238, 0.15); 
					color: #a78bfa; 
					border: 1px solid #7b68ee; 
					box-shadow: 0 0 5px rgba(123, 104, 238, 0.3); 
					margin-left: auto; 
					padding: 2px 8px; 
					cursor: pointer; 
					font-size: 10px; 
					font-weight: 700; 
					border-radius: 3px; 
					flex-shrink: 0;
					transition: all 0.2s ease;
				`;

				btn.addEventListener("mouseenter", () => (btn.style.background = "rgba(123, 104, 238, 0.3)"));
				btn.addEventListener("mouseleave", () => (btn.style.background = "rgba(123, 104, 238, 0.15)"));

				const gridNode = tile.querySelector('div[class*="InventoryView__grid"]');

				btn.addEventListener("click", (e) => {
					e.preventDefault();
					if (gridNode) mountLogisticsApp(tile, gridNode, stationName);
				});

				sortControls.appendChild(btn);
			});

			if (triggerAppRender) {
				clearTimeout(renderDebounceTimeout);
				renderDebounceTimeout = setTimeout(() => {
					triggerAppRender();
				}, 400);
			}
		});

		if (document.body) {
			observer.observe(document.body, { childList: true, subtree: true });
		} else {
			document.addEventListener("DOMContentLoaded", () => {
				if (document.body) observer.observe(document.body, { childList: true, subtree: true });
			});
		}
	}

	function cleanupHubInventory() {
		isLogisticsEnabled = false;
		document.querySelectorAll('div[class*="TileFrame__frame"]').forEach((tileNode) => {
			if (tileNode.dataset.logisticsOn === "true") {
				tileNode.dataset.logisticsOn = "false";
				tileNode.querySelector(".pnt-compact-logistics-bar")?.remove();
				tileNode.querySelector(".pnt-missing-banner")?.remove();
				tileNode.querySelector(".pnt-compact-drawer")?.remove();
				const gridNode = tileNode.querySelector('div[class*="InventoryView__grid"]');
				if (gridNode) {
					gridNode.querySelectorAll(".pnt-clean-badge").forEach((b) => b.remove());
					gridNode.querySelectorAll('div[class*="GridItemView__container"]').forEach((el) => {
						el.style.opacity = "";
						el.style.filter = "";
						el.style.boxShadow = "";
					});
				}
			}
			const btn = tileNode.querySelector(".pnt-logistics-btn");
			if (btn) btn.remove();
			delete tileNode.dataset.logisticsBtnInjected;
		});
		triggerAppRender = null;
	}

	window.addEventListener("message", (evt) => {
		if (evt.source === window && evt.data && evt.data.type === "prun-ingame-ui-settings") {
			const settings = evt.data.settings;
			if (settings) {
				if (settings.hubInventory === false) {
					cleanupHubInventory();
				} else if (settings.hubInventory === true && !isLogisticsEnabled) {
					isLogisticsEnabled = true;
				}
			}
		}
	});

	observeStationInventories();
})();
