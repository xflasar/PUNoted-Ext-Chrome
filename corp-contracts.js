/**
 * PrUn Corporate Contracts Tagger & Price Inspector - corp-contracts.js
 * Architecture: Lazy API Fetching + Debounced MutationObserver + UI Decorator
 */
(() => {
	"use strict";

	const TICKER_MAP = window.PUNOTED_TICKER_MAP || {};

	// --- 1. STATE & CACHE ---
	let corpMembers = [];
	let isMembersLoaded = false;
	let isMembersLoading = false;

	let cachedCorpPrices = null;
	let cacheTimestampCorpPrices = 0;
	let corpPricesPromise = null;
	const CACHE_TTL_MS = 5 * 60 * 1000;

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

	// --- 2. API FETCHER ---
	async function fetchCorpMembers() {
		if (isMembersLoaded || isMembersLoading) return;
		isMembersLoading = true;

		try {
			const authCtx = await getExtensionAuthContext();
			const extToken = authCtx.token;
			const baseApiUrl = authCtx.serverUrl || (authCtx.currentEnv === "dev" ? "http://localhost:9900" : "https://api.punoted.net");
			
			const headers = { "Content-Type": "application/json" };
			if (extToken) {
				headers["Authorization"] = `Bearer ${extToken}`;
				headers["X-Data-Token"] = extToken;
			}

			const response = await fetch(`${baseApiUrl}/v1/corporation/members`, {
				method: "GET",
				headers,
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: Failed to load corporation members.`);
			}

			const corpData = await response.json();
			if (corpData && corpData.data && Array.isArray(corpData.data.members)) {
				corpMembers = corpData.data.members;
				isMembersLoaded = true;
				tagContracts();
			}
		} catch (error) {
			console.warn("[Corp Tagger] Unable to fetch corporation members:", error.message);
			// Retry after 5s if extension token wasn't ready yet
			setTimeout(fetchCorpMembers, 5000);
		} finally {
			isMembersLoading = false;
		}
	}

	function getTicker(materialName) {
		if (!materialName) return null;
		const clean = materialName.trim();
		const map = window.PUNOTED_TICKER_MAP || {};
		if (map[clean]) return map[clean];
		
		// Case-insensitive lookup
		const lower = clean.toLowerCase();
		for (const [name, code] of Object.entries(map)) {
			if (name.toLowerCase() === lower || code.toLowerCase() === lower) {
				return code;
			}
		}
		return clean;
	}

	async function getCorpPrices() {
		if (cachedCorpPrices && Date.now() - cacheTimestampCorpPrices < CACHE_TTL_MS) {
			return cachedCorpPrices;
		}
		if (corpPricesPromise) {
			return corpPricesPromise;
		}

		corpPricesPromise = (async () => {
			try {
				const authCtx = await getExtensionAuthContext();
				const extToken = authCtx.token;
				const baseApiUrl = authCtx.serverUrl || (authCtx.currentEnv === "dev" ? "http://localhost:9900" : "https://api.punoted.net");
				
				const headers = { "Content-Type": "application/json" };
				if (extToken) {
					headers["Authorization"] = `Bearer ${extToken}`;
					headers["X-Data-Token"] = extToken;
				}

				const response = await fetch(`${baseApiUrl}/v1/corporation/prices`, { headers });
				if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to load CORP price data.`);

				cachedCorpPrices = await response.json();
				cacheTimestampCorpPrices = Date.now();
				return cachedCorpPrices;
			} catch (error) {
				console.warn("[Corp Tagger] Failed to fetch CORP prices:", error.message);
				return cachedCorpPrices || [];
			} finally {
				corpPricesPromise = null;
			}
		})();

		return corpPricesPromise;
	}

	// --- 3. UI DECORATOR ---
	function createCorpBadge() {
		const tag = document.createElement("span");
		tag.className = "custom-corp-tag";
		tag.textContent = "CORP";
		tag.style.cssText = `
			margin-left: 6px;
			padding: 0 4px;
			font-size: 8px;
			font-weight: 800;
			letter-spacing: 0.5px;
			color: #00f3ff;
			background: rgba(0, 243, 255, 0.1);
			border: 1px solid rgba(0, 243, 255, 0.6);
			border-radius: 2px;
			vertical-align: middle;
			display: inline-block;
			line-height: 12px;
			user-select: none;
			box-shadow: 0 0 4px rgba(0, 243, 255, 0.3);
		`;
		return tag;
	}

	function tagContracts() {
		if (!isMembersLoaded || !Array.isArray(corpMembers) || corpMembers.length === 0) return;

		const isMember = (name) => {
			if (!name) return false;
			const clean = name.replace(/[\uF000-\uF8FF]/g, "").trim().toLowerCase();
			return corpMembers.some(
				(m) => (m.company_name && m.company_name.toLowerCase() === clean) ||
				       (m.company_code && m.company_code.toLowerCase() === clean)
			);
		};

		// 3A. Tag in Contract Detail Windows (.rp-command-CONT)
		const contFrames = document.querySelectorAll(".rp-command-CONT, div[class*='TileFrame__frame']");
		contFrames.forEach((frame) => {
			// Check Partner field in FormComponent (top metadata)
			frame.querySelectorAll("div[class*='FormComponent__containerPassive']").forEach((formRow) => {
				const label = formRow.querySelector("label");
				if (label && label.textContent.trim().toLowerCase() === "partner") {
					const valContainer = formRow.querySelector("div[class*='StaticInput__static']");
					if (valContainer && !valContainer.querySelector(".custom-corp-tag")) {
						const link = valContainer.querySelector("a, span[class*='Link']");
						const partnerName = link ? link.textContent : valContainer.textContent;
						if (isMember(partnerName)) {
							valContainer.appendChild(createCorpBadge());
						}
					}
				}
			});

			// Check Party column in Contract Conditions table
			const condTable = frame.querySelector("table");
			if (condTable) {
				const ths = condTable.querySelectorAll("thead th");
				let partyColIdx = -1;
				ths.forEach((th, idx) => {
					if (th.textContent.trim().toLowerCase() === "party") partyColIdx = idx;
				});

				if (partyColIdx !== -1) {
					condTable.querySelectorAll("tbody tr").forEach((tr) => {
						const partyTd = tr.cells[partyColIdx];
						if (partyTd && !partyTd.querySelector(".custom-corp-tag")) {
							const textEl = partyTd.querySelector("a, span[class*='Link']") || partyTd;
							if (isMember(textEl.textContent)) {
								partyTd.appendChild(createCorpBadge());
							}
						}
					});
				}
			}
		});

		// 3B. Tag in Generic Contract Tables (e.g. CONTS list)
		const tables = document.querySelectorAll("table");
		tables.forEach((table) => {
			const headers = table.querySelectorAll("thead th, tr:first-child th, tr:first-child td");
			if (headers.length < 3) return;

			let partnerColIdx = -1;
			headers.forEach((th, idx) => {
				const txt = (th.textContent || "").trim();
				if (txt.includes("Partner")) partnerColIdx = idx;
			});

			if (partnerColIdx === -1) return;

			const rows = table.querySelectorAll("tbody tr");
			rows.forEach((row) => {
				const partnerTd = row.cells[partnerColIdx];
				if (!partnerTd || partnerTd.querySelector(".custom-corp-tag")) return;

				const partnerElement = partnerTd.querySelector("a, span[class*='Link'], span[class*='Text'], div[class*='Link']") || partnerTd;
				if (!partnerElement) return;

				if (isMember(partnerElement.textContent)) {
					partnerElement.appendChild(createCorpBadge());
				}
			});
		});
	}

	// --- 4. CONTRACT DETAIL PRICE INSPECTOR WIDGET ---
	async function inspectContractViewerPrices() {
		const contractFrames = document.querySelectorAll(".rp-command-CONT, div[class*='TileFrame__frame']");
		if (contractFrames.length === 0) return;

		for (const frame of contractFrames) {
			const header = frame.querySelector("div[class*='TileFrame__header']");
			const titleText = header ? header.textContent : "";
			if (!frame.classList.contains("rp-command-CONT") && !titleText.includes("Contract ") && !titleText.includes("CONT ")) {
				continue;
			}

			const table = frame.querySelector("table");
			if (!table) continue;

			const rows = Array.from(table.querySelectorAll("tbody tr"));
			if (rows.length < 2) continue;

			// Parse all conditions and group delivery/provisioning with their corresponding payments
			// In APEX, multi-stage or repeatable contracts have paired conditions:
			// e.g., Provisioning of X units ... followed by Payment of Y ICA,
			// or each Provisioning/Delivery condition has a corresponding Payment condition.
			const conditions = [];

			rows.forEach((row) => {
				const cells = row.cells;
				if (cells.length < 2) return;
				const condTd = cells[1];
				const rawText = condTd.textContent.replace(/[\uF000-\uF8FF]/g, "").trim();

				// Match Payment: "Payment of 200,000 ICA"
				const payMatch = rawText.match(/Payment\s+of\s+([0-9,.]+)\s+([A-Za-z]{3})/i);
				if (payMatch) {
					const cleanNum = payMatch[1].replace(/,/g, "");
					conditions.push({
						type: "payment",
						td: condTd,
						amount: parseFloat(cleanNum),
						currency: payMatch[2].toUpperCase(),
						rawText,
					});
					return;
				}

				// Match Provisioning / Delivery: "Provisioning of 1,000 units of Lithium Ore @ ..." or "Delivery of 1,000 units of Iron Ore to ..."
				const itemMatch = rawText.match(/(?:Delivery|Provision(?:ing)?)\s+of\s+([0-9,.]+)\s+units?\s+of\s+(.+?)(?:\s+(?:@|to|at|from)\s+|$)/i);
				if (itemMatch) {
					const cleanQty = itemMatch[1].replace(/,/g, "");
					conditions.push({
						type: "item",
						td: condTd,
						qty: parseFloat(cleanQty),
						materialName: itemMatch[2].trim(),
						rawText,
					});
				}
			});

			const itemConditions = conditions.filter((c) => c.type === "item");
			const paymentConditions = conditions.filter((c) => c.type === "payment");

			if (itemConditions.length === 0 || paymentConditions.length === 0) continue;

			// Fetch Corp Price table
			const corpPrices = await getCorpPrices();

			// Case A: 1-to-1 matching (e.g. 6 items and 6 payments)
			// Match each item condition with its corresponding payment condition in sequence
			if (itemConditions.length === paymentConditions.length) {
				for (let i = 0; i < itemConditions.length; i++) {
					const item = itemConditions[i];
					const pay = paymentConditions[i];
					if (item.td.querySelector(".custom-corp-price-tag")) continue;

					const unitPrice = pay.amount / item.qty;
					renderPriceBadge(item.td, unitPrice, pay.currency, item.materialName, corpPrices);
				}
			} else if (paymentConditions.length === 1 && itemConditions.length === 1) {
				// Single condition pair
				const item = itemConditions[0];
				const pay = paymentConditions[0];
				if (!item.td.querySelector(".custom-corp-price-tag")) {
					const unitPrice = pay.amount / item.qty;
					renderPriceBadge(item.td, unitPrice, pay.currency, item.materialName, corpPrices);
				}
			} else if (paymentConditions.length === 1 && itemConditions.length > 1) {
				// Single total payment for multiple identical materials (or single delivery across multiple depots)
				// If all items are the same material, split or show average
				const allSameMaterial = itemConditions.every(
					(it) => it.materialName.toLowerCase() === itemConditions[0].materialName.toLowerCase()
				);
				if (allSameMaterial) {
					const totalQty = itemConditions.reduce((acc, it) => acc + it.qty, 0);
					const avgUnitPrice = paymentConditions[0].amount / totalQty;
					for (const item of itemConditions) {
						if (item.td.querySelector(".custom-corp-price-tag")) continue;
						renderPriceBadge(item.td, avgUnitPrice, paymentConditions[0].currency, item.materialName, corpPrices);
					}
				}
			}
		}
	}

	function renderPriceBadge(containerTd, unitPrice, currency, materialName, corpPrices) {
		const ticker = getTicker(materialName);
		const tickerLower = ticker ? ticker.toLowerCase() : "";

		let corpPrice = null;
		if (corpPrices && Array.isArray(corpPrices)) {
			const found = corpPrices.find((p) => {
				const t = (p.Ticker || p.ticker || "").toLowerCase();
				return t === tickerLower;
			});
			if (found && found.Price !== undefined) corpPrice = found.Price;
			else if (found && found.price !== undefined) corpPrice = found.price;
		}

		const priceDiff = corpPrice ? (unitPrice - corpPrice) : null;
		const diffPct = corpPrice ? ((priceDiff / corpPrice) * 100) : 0;
		const isExactMatch = corpPrice ? (Math.abs(priceDiff) <= 0.05) : false;

		const tag = document.createElement("span");
		tag.className = "custom-corp-price-tag";
		tag.style.cssText = `
			margin-left: 8px;
			padding: 1px 5px;
			border-radius: 3px;
			font-size: 9px;
			font-weight: 700;
			display: inline-flex;
			align-items: center;
			gap: 4px;
			vertical-align: middle;
			line-height: 13px;
			background: #090a14;
			border: 1px solid ${isExactMatch ? "#22c55e" : (corpPrice ? "#f59e0b" : "#475569")};
			box-shadow: 0 0 4px ${isExactMatch ? "rgba(34, 197, 94, 0.25)" : "rgba(245, 158, 11, 0.2)"};
		`;

		let badgeHtml = `<span style="color: #38bdf8;">${unitPrice.toFixed(2)} ${currency}/u</span>`;
		if (corpPrice !== null) {
			if (isExactMatch) {
				badgeHtml += `<span style="color: #86efac; background: rgba(34, 197, 94, 0.2); padding: 0 3px; border-radius: 2px;">✓ CORP</span>`;
			} else {
				const sign = diffPct > 0 ? "+" : "";
				const diffColor = diffPct > 0 ? "#f87171" : "#38bdf8";
				badgeHtml += `<span style="color: #94a3b8;">Corp: <b style="color: #e2e8f0;">${corpPrice.toFixed(2)}</b></span>`;
				badgeHtml += `<span style="color: ${diffColor}; background: rgba(245, 158, 11, 0.2); padding: 0 3px; border-radius: 2px;">${sign}${diffPct.toFixed(1)}%</span>`;
			}
		} else {
			badgeHtml += `<span style="color: #64748b; font-size: 8px;">(no price)</span>`;
		}

		tag.innerHTML = badgeHtml;
		containerTd.appendChild(tag);
	}

	// --- 5. DEBOUNCED MUTATION OBSERVER & LIFECYCLE ---
	let debounceTimeout = null;
	const observer = new MutationObserver(() => {
		if (debounceTimeout) return;
		debounceTimeout = setTimeout(() => {
			tagContracts();
			inspectContractViewerPrices();
			debounceTimeout = null;
		}, 150);
	});

	function cleanupCorpContracts() {
		observer.disconnect();
		document.querySelectorAll(".custom-corp-tag, .punoted-corp-price-tag").forEach((el) => el.remove());
	}

	window.addEventListener("message", (evt) => {
		if (evt.source === window && evt.data && evt.data.type === "prun-ingame-ui-settings") {
			const settings = evt.data.settings;
			if (settings && settings.corpContracts === false) {
				cleanupCorpContracts();
			}
		}
	});

	fetchCorpMembers();
	getCorpPrices();

	if (document.body) {
		observer.observe(document.body, { childList: true, subtree: true });
	} else {
		document.addEventListener("DOMContentLoaded", () => {
			if (document.body) observer.observe(document.body, { childList: true, subtree: true });
		});
	}
})();
