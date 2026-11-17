/**
 * PrUn Contract Pricing Integrator - contract.js
 * Architektura: DOM Polling + React State Manipulation + Async JSON Parsing + In-Memory Caching
 */
(() => {
	const TICKER_MAP = window.PUNOTED_TICKER_MAP || {};

	// --- STATE MANAGEMENT (IN-MEMORY CACHE) ---
	let cachedMarketData = null;
	let cacheTimestampMarket = 0;

	let cachedCorpData = null;
	let cacheTimestampCorp = 0;

	const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minut platnosti

	// --- UTILITIES ---
	function setReactInputValue(input, value) {
		const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
			window.HTMLInputElement.prototype,
			"value",
		).set;
		nativeInputValueSetter.call(input, value);
		input.dispatchEvent(new Event("input", { bubbles: true }));
		input.dispatchEvent(new Event("change", { bubbles: true }));
	}

	async function getExtensionAuthContext() {
		return new Promise((resolve) => {
			const handler = (evt) => {
				if (evt.source === window && evt.data && evt.data.type === 'prun-auth-token-response') {
					window.removeEventListener('message', handler);
					resolve({
						token: evt.data.token || null,
						currentEnv: evt.data.currentEnv || 'prod',
						serverUrl: evt.data.serverUrl || 'https://api.punoted.net'
					});
				}
			};
			window.addEventListener('message', handler);
			window.postMessage({ type: 'prun-get-auth-token' }, '*');
			setTimeout(() => {
				window.removeEventListener('message', handler);
				resolve({
					token: null,
					currentEnv: 'prod',
					serverUrl: 'https://api.punoted.net'
				});
			}, 1500);
		});
	}

	// --- API LAYER ---
	async function getMarketData() {
		if (cachedMarketData && Date.now() - cacheTimestampMarket < CACHE_TTL_MS) {
			return cachedMarketData;
		}

		const authCtx = await getExtensionAuthContext();
		const baseApiUrl = authCtx.serverUrl || (authCtx.currentEnv === "dev" ? "http://localhost:9900" : "https://api.punoted.net");
		const headers = {};
		if (authCtx.token) headers["Authorization"] = `Bearer ${authCtx.token}`;

		const response = await fetch(`${baseApiUrl}/v1/cx/prices`, { headers });
		if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to load CX price data.`);

		cachedMarketData = await response.json();
		cacheTimestampMarket = Date.now();
		return cachedMarketData;
	}

	async function getCorpData() {
		if (cachedCorpData && Date.now() - cacheTimestampCorp < CACHE_TTL_MS) {
			return cachedCorpData;
		}

		try {
			const authCtx = await getExtensionAuthContext();
			const baseApiUrl = authCtx.serverUrl || (authCtx.currentEnv === "dev" ? "http://localhost:9900" : "https://api.punoted.net");
			const headers = {};
			if (authCtx.token) headers["Authorization"] = `Bearer ${authCtx.token}`;

			const response = await fetch(`${baseApiUrl}/v1/corporation/prices`, { headers });
			if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to load CORP price data.`);

			cachedCorpData = await response.json();
			cacheTimestampCorp = Date.now();
			return cachedCorpData;
		} catch (error) {
			console.warn("[Pricing Integrator] Failed to fetch CORP prices:", error.message);
			return [];
		}
	}

	async function fetchPricesFromAPI(commodityName) {
		try {
			const ticker = TICKER_MAP[commodityName];
			if (!ticker) {
				console.warn(`[Pricing Integrator] Missing ticker mapping for: ${commodityName}`);
				return { cx: null, corp: null };
			}

			// 1. Process CX Benchmark Price (average across exchanges)
			const marketData = await getMarketData();
			let cxPrice = null;

			const marketRow = marketData.find((item) => item.Ticker === ticker);
			if (marketRow) {
				const exchangeKeys = [
					"AI1-BidPrice",
					"CI1-BidPrice",
					"CI2-BidPrice",
					"NC1-BidPrice",
					"NC2-BidPrice",
					"IC1-BidPrice",
				];

				const validBids = exchangeKeys
					.map((key) => parseFloat(marketRow[key]))
					.filter((val) => !isNaN(val) && val > 0);

				if (validBids.length > 0) {
					const sum = validBids.reduce((acc, curr) => acc + curr, 0);
					cxPrice = sum / validBids.length;
					cxPrice = Math.round(cxPrice * 100) / 100;
				}
			}

			// 2. Process CORP Internal Price
			const corpData = await getCorpData();
			let corpPrice = null;

			if (corpData && Array.isArray(corpData)) {
				const corpRow = corpData.find((item) => item.ticker === ticker);
				if (corpRow && corpRow.price !== undefined) {
					corpPrice = corpRow.price;
				}
			}

			return { cx: cxPrice, corp: corpPrice };
		} catch (error) {
			console.error("[Pricing Integrator] Error processing price data:", error);
			return { cx: null, corp: null };
		}
	}

	// --- UI INJECTION LAYER ---
	function injectContractPricingUI() {
		const priceInputs = document.querySelectorAll(
			'input[name*="pricePerUnit"]',
		);

		priceInputs.forEach((priceInput) => {
			if (priceInput.parentElement.querySelector(".prun-pricing-wrapper"))
				return;

			const wrapper = document.createElement("div");
			wrapper.className = "prun-pricing-wrapper";
			wrapper.style.cssText = "display: flex; gap: 4px; margin-top: 3px; width: 100%; box-sizing: border-box;";

			const createBtn = (text, normalBg, borderColor) => {
				const btn = document.createElement("button");
				btn.textContent = text;
				btn.type = "button";
				btn.style.cssText = `
					background: ${normalBg};
					color: #cbd5e1;
					border: 1px solid ${borderColor};
					border-radius: 3px;
					padding: 2px 6px;
					font-size: 10px;
					font-weight: 700;
					cursor: pointer;
					flex: 1;
					transition: all 0.15s ease;
					text-align: center;
				`;
				btn.addEventListener("mouseenter", () => {
					btn.style.filter = "brightness(1.2)";
				});
				btn.addEventListener("mouseleave", () => {
					btn.style.filter = "none";
				});
				return btn;
			};

			const cxBtn = createBtn("CX BID", "#1e1b4b", "rgba(123, 104, 238, 0.4)");
			const corpBtn = createBtn("CORP PRICE", "#0f172a", "rgba(56, 189, 248, 0.4)");

			const handlePriceClick = async (type, btnElement) => {
				const nameMatch = priceInput.name.match(/trades\[(\d+)\]/);
				if (!nameMatch) return;
				const tradeIndex = nameMatch[1];

				const commLabel = document.querySelector(
					`label[for="trades[${tradeIndex}].material"]`,
				);
				if (!commLabel) {
					btnElement.style.borderColor = "#ef4444";
					setTimeout(() => {
						btnElement.style.borderColor = type === "cx" ? "rgba(123, 104, 238, 0.4)" : "rgba(56, 189, 248, 0.4)";
					}, 1000);
					return;
				}

				const commInput = commLabel.parentElement.querySelector("input");
				if (!commInput || !commInput.value) {
					btnElement.style.borderColor = "#ef4444";
					setTimeout(() => {
						btnElement.style.borderColor = type === "cx" ? "rgba(123, 104, 238, 0.4)" : "rgba(56, 189, 248, 0.4)";
					}, 1000);
					return;
				}

				const commodityName = commInput.value.trim();
				const originalText = btnElement.textContent;
				btnElement.textContent = "...";
				btnElement.disabled = true;

				try {
					const prices = await fetchPricesFromAPI(commodityName);
					if (prices[type] !== null && prices[type] !== undefined) {
						setReactInputValue(priceInput, prices[type].toString());
					} else {
						btnElement.style.borderColor = "#ef4444";
						setTimeout(() => {
							btnElement.style.borderColor = type === "cx" ? "rgba(123, 104, 238, 0.4)" : "rgba(56, 189, 248, 0.4)";
						}, 1000);
					}
				} catch (error) {
					console.error("[Pricing Integrator] API Error:", error);
				} finally {
					btnElement.textContent = originalText;
					btnElement.disabled = false;
				}
			};

			cxBtn.addEventListener("click", (e) => {
				e.preventDefault();
				handlePriceClick("cx", cxBtn);
			});

			corpBtn.addEventListener("click", (e) => {
				e.preventDefault();
				handlePriceClick("corp", corpBtn);
			});

			wrapper.appendChild(cxBtn);
			wrapper.appendChild(corpBtn);

			priceInput.parentNode.insertBefore(wrapper, priceInput.nextSibling);
		});
	}

	// --- MUTATION OBSERVER INSTEAD OF BLIND INTERVAL ---
	let pricingDebounce = null;
	const observer = new MutationObserver(() => {
		if (pricingDebounce) return;
		pricingDebounce = setTimeout(() => {
			injectContractPricingUI();
			pricingDebounce = null;
		}, 200);
	});

	if (document.body) {
		observer.observe(document.body, { childList: true, subtree: true });
	} else {
		document.addEventListener("DOMContentLoaded", () => {
			if (document.body) observer.observe(document.body, { childList: true, subtree: true });
		});
	}
})();
