/**
 * PrUn Corporate Exchange (PNT CX) - cxl.js
 * Architecture: Clean Architecture / Modular MVP Pattern
 * 
 * Layers:
 * 1. DOMAIN & CONFIG        - Commodity mapping, entities & constants
 * 2. INFRASTRUCTURE / API   - Network fetch, extension auth context & DTO normalization
 * 3. STATE MANAGEMENT       - Reactive data store, filtering & sorting logic
 * 4. PRESENTATION / VIEW    - DOM generation, CSS styling & table rendering
 * 5. APPLICATION CONTROLLER - Event coordination between View, Store and API
 * 6. PLATFORM DRIVER        - APEX MutationObserver & buffer hookup
 */
(() => {
	"use strict";

	// =========================================================================
	// 1. DOMAIN & CONFIG LAYER
	// =========================================================================
	const TICKER_MAP = {
		"AI-Assisted Lab Coat": "LC",
		"Active Cooling Device": "FAN",
		"Active Water Filter": "AWF",
		"Advanced Anti-rad Plate": "ARP",
		"Advanced Bulkhead": "ABH",
		"Advanced Deck Elements": "ADE",
		"Advanced Fuel Pump": "AFP",
		"Advanced Fuel Rod": "AFR",
		"Advanced High-G Seats": "AGS",
		"Advanced Hull Plate": "AHP",
		"Advanced Nozzle": "ANZ",
		"Advanced STL Engine": "AEN",
		"Advanced Structural Elements": "ASE",
		"Advanced Thermal Protection Material": "ATP",
		"Advanced Thermal Protection Tile": "APT",
		"Advanced Transistor": "TRN",
		"Advanced Transparent Aperture": "ATA",
		"Advanced Whipple Shielding": "AWH",
		"Aerostat Foundation": "AEF",
		"Air Scrubber": "AIR",
		"All-Purpose Fodder": "FOD",
		"Alpha-Stabilized Titanium": "AST",
		"Alpha-Stabilized Tungsten": "WAL",
		Aluminium: "AL",
		"Aluminium Ore": "ALO",
		Alurhenium: "ALR",
		Ammonia: "AMM",
		"Antenna Array": "AAR",
		Argon: "AR",
		"Artificial Soil": "SOI",
		"Audio Distribution System": "ADS",
		"Audio Transmitter": "TRA",
		"Auto-Doc": "ADR",
		"Automated Cooling System": "ACS",
		"Bacterial Tungsten Solution": "BTS",
		Bandages: "IND",
		"Basic AI Framework": "BAI",
		"Basic Anti-rad Plate": "BRP",
		"Basic Bulkhead": "BBH",
		"Basic Deck Elements": "BDE",
		"Basic Fuel Pump": "BFP",
		"Basic Fuel Rod": "BFR",
		"Basic High-G Seats": "BGS",
		"Basic Hull Plate": "BHP",
		"Basic Mainframe": "BMF",
		"Basic Medical Kit": "MED",
		"Basic Nozzle": "NOZ",
		"Basic Overalls": "OVE",
		"Basic Rations": "RAT",
		"Basic Structural Elements": "BSE",
		"Basic Thermal Protection Material": "THP",
		"Basic Thermal Protection Tile": "BPT",
		"Basic Transparent Aperture": "BTA",
		"Basic Whipple Shielding": "BWH",
		"Basic Workstation": "BWS",
		"Beryl Crystals": "BER",
		Beryllium: "BE",
		"Bioreactive Minerals": "BRM",
		"Biosphere Unit": "BSU",
		"Blue Gold": "BGO",
		"Body Scanner": "BSC",
		"Boron Crystals": "BOR",
		Borosilicate: "BOS",
		"Breathable Liquid": "BL",
		Bronze: "BRO",
		"Budget Connectors": "BCO",
		"Caffeinated Beans": "CAF",
		"Caffeinated Infusion": "COF",
		Calcium: "CA",
		"Caliche Rock": "CLI",
		"Capacitive Display": "CD",
		Carbon: "C",
		"Ceramic Fabric": "CF",
		"Ceramic-Tungsten Fabric": "CTF",
		"Chemical Reagents": "REA",
		Chlorine: "CL",
		"Climate Controller": "CC",
		"Combustion Chamber": "CHA",
		"Command Bridge MK1": "BR1",
		"Command Bridge MK2": "BR2",
		"Communication System": "COM",
		Copper: "CU",
		"Copper Ore": "CUO",
		"Core Module Kit": "CMK",
		"Cotton Fabric": "COT",
		"Crew Quarters (Large)": "CQL",
		"Crew Quarters (Medium)": "CQM",
		"Crew Quarters (Small)": "CQS",
		"Crew Quarters (Tiny)": "CQT",
		"Crowd Control Drone": "CCD",
		"Cryogenic Stabilizer": "CST",
		"Cryogenic Unit": "CRU",
		"Cryopreservation Unit": "CPU",
		"Data Core": "DC",
		"Decent Rations": "FIM",
		"Deuterium": "D",
		"Drinking Water": "DW",
		"Drones": "DRN",
		"Electronic Components": "BGC",
		"Engineering Plastics": "ENG",
		"Enriched Beryl Crystals": "EBE",
		"Enriched Mineral Granulate": "EMG",
		"Enriched Rations": "MEA",
		"Exoskeleton": "EXO",
		"Field-Effect Transistor": "FET",
		"Filters": "FLT",
		"First Aid Kit": "FAK",
		"Flexible Polymer": "FP",
		"Fluorine": "F",
		"Flux": "FLX",
		"Fuel Rod": "FR",
		"Glass": "GLS",
		"Gold": "AU",
		"Gold Ore": "AUO",
		"Grain": "GRN",
		"Graphene": "GRA",
		"Halite": "HAL",
		"Helium": "HE",
		"High-Calorie Rations": "HCR",
		"High-Carb Grains": "GRN",
		"High-Carb Maize": "MAI",
		"High-Protein Beans": "BEA",
		"High-Tech Fab Module": "HTF",
		"Hops": "HOP",
		"Hortus Habitat": "HH",
		"Hydrocarbon Plants": "HCP",
		"Hydrogen": "H",
		"Hydrogen Isotopes": "HYD",
		"Hydroponic Farm": "HYF",
		"Hyper-Drive MK1": "HD1",
		"Hyper-Drive MK2": "HD2",
		"Incandescent Bulb": "IB",
		"Industrial Diamonds": "IND",
		"Information Storage Unit": "ISU",
		"Insulated Wire": "IWI",
		"Integrated Circuits": "IC",
		"Iron": "FE",
		"Iron Ore": "FEO",
		"Laborer Module Kit": "LMK",
		"Lead": "PB",
		"Lead Ore": "PBO",
		"Light Deck Elements": "LDE",
		"Light Drone": "LDR",
		"Light Hull Plate": "LHP",
		"Light Structural Elements": "LSE",
		"Limestone": "LST",
		"Liquid Nitrogen": "LN",
		"Liquid Oxygen": "LOX",
		"Lithium": "LI",
		"Lithium Ore": "LIO",
		"Luxury Food": "LUX",
		"Magnesium": "MG",
		"Magnesium Ore": "MGO",
		"Magnetic Coil": "MGC",
		"Magnetite": "MAG",
		"Meat": "MEA",
		"Medical Equipment": "MEQ",
		"Methane": "CH4",
		"Micro-Processor": "MCP",
		"Micro-Shield": "MSH",
		"Mineral Construction Granulate": "MCG",
		"Mineral Fertilizer": "FER",
		"Mineral Soil": "SL",
		"Navigation Computer": "NV",
		"Neon": "NE",
		"Neural Interface": "NUI",
		"Nickel": "NI",
		"Nickel Ore": "NIO",
		"Nitrogen": "N",
		"Nutrient Solution": "NUT",
		"Optics": "OPT",
		"Oxygen": "O",
		"Pharmaceuticals": "PH",
		"Photo-Voltaic Panel": "PVP",
		"Pioneer Module Kit": "PMK",
		"Planetary Telemetry Unit": "PTU",
		"Plastics": "PLA",
		"Platinum": "PT",
		"Platinum Ore": "PTO",
		"Poly-Ethylene": "PE",
		"Polymer Fabric": "POF",
		"Power Booster": "POB",
		"Power Cell": "POW",
		"Precision Parts": "PPT",
		"Pre-Fab Module": "PFM",
		"Processor": "PRC",
		"Promethium": "PM",
		"Protective Coating": "PRC",
		"Protein Paste": "PST",
		"Quantum Computer": "QC",
		"Quantum Processor": "QPR",
		"Radiation Shielding": "RSH",
		"Radioactive Isotopes": "RAI",
		"Raw Meat": "RME",
		"Raw Veggies": "RVE",
		"Reactor Core": "COR",
		"Refined Silicon": "RSI",
		"Reinforced Bulkhead": "RBH",
		"Repair Kit": "REP",
		"Rocket Fuel": "FF",
		"Rubber": "RUB",
		"Scaffolding": "SCA",
		"Scientist Module Kit": "SMK",
		"Sensors": "SEN",
		"Settler Module Kit": "STL",
		"Silicon": "SI",
		"Silicon Ore": "SIO",
		"Silver": "AG",
		"Silver Ore": "AGO",
		"Small STL Engine": "SEN",
		"Solar Cells": "SC",
		"Solar Panel": "SP",
		"Spices": "SPI",
		"Spirulina": "SPU",
		"Steel": "STL",
		"Stimulants": "STI",
		"Structural Elements": "BSE",
		"Sub-Light Engine": "STL",
		"Sulfur": "S",
		"Super-Alloy": "SA",
		"Super-Conductor": "SCN",
		"Synthetic Fabric": "SF",
		"Synthetic Meat": "SYM",
		"Tantalum": "TA",
		"Tantalum Ore": "TAO",
		"Technetium": "TC",
		"Thermal Protection Material": "THP",
		"Thermal Protection Tile": "TPT",
		"Thorium": "TH",
		"Titanium": "TI",
		"Titanium Ore": "TIO",
		"Tools": "TOO",
		"Transistor": "TRN",
		"Transparent Aperture": "TA",
		"Tungsten": "W",
		"Tungsten Ore": "WO",
		"Turbine": "TUR",
		"Universal Fabric": "UF",
		"Vegetables": "VEG",
		"Water": "H2O",
		"Whipple Shielding": "WSH",
		"Window Glass": "WGL",
		"Wireless Transmitter": "WTR",
		"Worker Module Kit": "WMK",
		"Zirconium": "ZR"
	};

	const REVERSE_TICKER_MAP = Object.entries(TICKER_MAP).reduce((acc, [name, ticker]) => {
		acc[ticker] = name;
		return acc;
	}, {});

	// =========================================================================
	// 2. INFRASTRUCTURE & API LAYER
	// =========================================================================
	class CxApiService {
		/**
		 * Retrieves authentication token and active server URL from content/background script.
		 */
		static async getAuthContext() {
			return new Promise((resolve) => {
				const handler = (evt) => {
					if (evt.source === window && evt.data && evt.data.type === "prun-auth-token-response") {
						window.removeEventListener("message", handler);
						resolve({
							token: evt.data.token || null,
							currentEnv: evt.data.currentEnv || "prod",
							serverUrl: evt.data.serverUrl || "https://api.punoted.net"
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
						serverUrl: "https://api.punoted.net"
					});
				}, 1500);
			});
		}

		/**
		 * Fetches vendor orders from PUNoted backend and normalizes them into clean entities.
		 */
		static async fetchVendorOrders() {
			const authCtx = await this.getAuthContext();
			const baseApiUrl = authCtx.serverUrl || (authCtx.currentEnv === "dev" ? "http://localhost:9900" : "https://api.punoted.net");
			
			const headers = { "Content-Type": "application/json" };
			if (authCtx.token) {
				headers["Authorization"] = `Bearer ${authCtx.token}`;
			}

			const response = await fetch(`${baseApiUrl}/v1/vendors/`, { headers });
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: Failed to load vendor directory.`);
			}

			const jsonRes = await response.json();
			const vendors = Array.isArray(jsonRes) ? jsonRes : (jsonRes.vendors || jsonRes.data || []);
			return this.normalizeOrders(vendors);
		}

		/**
		 * Normalizes raw nested vendor responses into flat Order entities per location.
		 */
		static normalizeOrders(vendors) {
			const normalizedOrders = [];

			vendors.forEach((vendorEntry) => {
				const vendorMeta = vendorEntry.vendor || vendorEntry;
				const orders = vendorEntry.orders || [];
				if (!vendorMeta || vendorMeta.isactive === false || !Array.isArray(orders)) return;

				const companyCode = vendorMeta.companycode || "CORP";
				const operatorName = vendorMeta.gamename || vendorMeta.companyname || "";

				orders.forEach((order) => {
					const ticker = order.materialticker || order.ticker;
					if (!ticker) return;

					const rawLocations = order.location || order.locations;
					const locationsList = Array.isArray(rawLocations)
						? rawLocations
						: (rawLocations ? [rawLocations] : [{ name: "Base", available: order.available || order.amount || 0 }]);

					const rawType = (order.ordertype || "ALL").toUpperCase();
					const normalizedType = (rawType === "BID" || rawType === "BUY") ? "BUY" : "SELL";

					const unitPrice = order.price
						? (order.price.fixedprice === -1 ? order.price.corpprice : order.price.fixedprice)
						: (order.price || 0);
					const numPrice = parseFloat(unitPrice) || 0;

					locationsList.forEach((locationObj, locIdx) => {
						const { name: locName, code: locCode } = this.parseLocationDetails(locationObj);
						const availQty = this.parseAvailableQuantity(locationObj, order);
						const totalVal = availQty * numPrice;
						const locDisplay = locCode ? `${locName} (${locCode})` : locName;
						const locId = locationObj.id || locCode || locName || locIdx;

						normalizedOrders.push({
							id: `${companyCode}-${ticker}-${normalizedType}-${locId}`,
							ticker: ticker,
							name: REVERSE_TICKER_MAP[ticker] || ticker || "Unknown Material",
							type: normalizedType,
							amount: availQty,
							location: locDisplay,
							locationName: locName,
							locationCode: locCode,
							price: numPrice,
							total: totalVal,
							companyCode: companyCode,
							operatorName: operatorName,
						});
					});
				});
			});

			return normalizedOrders;
		}

		static parseLocationDetails(loc) {
			if (!loc) return { name: "Base", code: "" };
			if (typeof loc === "string") return { name: loc, code: "" };
			if (typeof loc === "object") {
				const name = loc.location_name || loc.name || loc.locationname || loc.location || "Base";
				const code = loc.location_code || loc.naturalid || loc.code || "";
				return { name, code };
			}
			return { name: "Base", code: "" };
		}

		static parseAvailableQuantity(loc, order) {
			if (typeof loc === "object" && loc !== null) {
				if (loc.available !== undefined && loc.available !== null) return Number(loc.available);
				if (loc.amount !== undefined && loc.amount !== null) return Number(loc.amount);
			}
			return Number(order.available !== undefined ? order.available : (order.amount || 0));
		}
	}

	// =========================================================================
	// 3. STATE MANAGEMENT LAYER
	// =========================================================================
	class CxStateStore {
		constructor() {
			this.orders = [];
			this.isLoading = false;
			this.error = null;
			this.filters = {
				search: "",
				type: "ALL",
				location: "ALL",
				sortCol: "ticker",
				sortAsc: true,
			};
		}

		setOrders(orders) {
			this.orders = orders;
			this.isLoading = false;
			this.error = null;
		}

		setLoading(isLoading) {
			this.isLoading = isLoading;
			if (isLoading) this.error = null;
		}

		setError(errorMsg) {
			this.error = errorMsg;
			this.isLoading = false;
		}

		setSearch(query) {
			this.filters.search = (query || "").trim().toLowerCase();
		}

		setTypeFilter(type) {
			this.filters.type = type || "ALL";
		}

		setLocationFilter(location) {
			this.filters.location = location || "ALL";
		}

		toggleSort(column) {
			if (this.filters.sortCol === column) {
				this.filters.sortAsc = !this.filters.sortAsc;
			} else {
				this.filters.sortCol = column;
				this.filters.sortAsc = true;
			}
		}

		getUniqueLocations() {
			const locationsSet = new Set();
			this.orders.forEach((o) => {
				if (o.location) locationsSet.add(o.location);
			});
			return Array.from(locationsSet).sort((a, b) => a.localeCompare(b));
		}

		getFilteredAndSortedOrders() {
			const { search, type, location, sortCol, sortAsc } = this.filters;

			const filtered = this.orders.filter((o) => {
				// 1. Text filter (multi-term matching)
				if (search) {
					const terms = search.split(/\s+/);
					const haystack = `${o.ticker} ${o.name} ${o.companyCode} ${o.operatorName} ${o.location}`.toLowerCase();
					if (!terms.every((term) => haystack.includes(term))) {
						return false;
					}
				}

				// 2. Type filter
				if (type !== "ALL") {
					if (type === "BUY" && o.type !== "BUY") return false;
					if (type === "SELL" && o.type !== "SELL") return false;
				}

				// 3. Location filter
				if (location !== "ALL" && o.location !== location) {
					return false;
				}

				return true;
			});

			// Sorting
			return filtered.sort((a, b) => {
				let valA = a[sortCol];
				let valB = b[sortCol];
				if (typeof valA === "string") valA = valA.toLowerCase();
				if (typeof valB === "string") valB = valB.toLowerCase();
				if (valA < valB) return sortAsc ? -1 : 1;
				if (valA > valB) return sortAsc ? 1 : -1;
				return 0;
			});
		}
	}

	// =========================================================================
	// 4. PRESENTATION / VIEW LAYER
	// =========================================================================
	class CxView {
		constructor(container) {
			this.container = container;
			this.renderLayout();
			this.bindElements();
		}

		renderLayout() {
			this.container.style.cssText =
				"position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; background: #0c0d12; color: #cbd5e1; font-family: 'Outfit', 'Inter', -apple-system, sans-serif; font-size: 11px; padding: 4px; overflow: hidden; box-sizing: border-box;";

			this.container.innerHTML = `
				<style>
					.pnt-cx-table {
						width: 100%;
						border-collapse: separate;
						border-spacing: 0;
						text-align: left;
						font-size: 11px;
					}
					.pnt-cx-table thead th {
						position: sticky;
						top: 0;
						background: #141722;
						color: #94a3b8;
						font-weight: 700;
						font-size: 10px;
						text-transform: uppercase;
						letter-spacing: 0.05em;
						padding: 5px 8px;
						border-bottom: 1px solid rgba(123, 104, 238, 0.3);
						white-space: nowrap;
						user-select: none;
						cursor: pointer;
						z-index: 2;
					}
					.pnt-cx-table thead th:hover {
						color: #f1f5f9;
					}
					.pnt-cx-table tbody tr {
						border-bottom: 1px solid rgba(255, 255, 255, 0.04);
						transition: background 0.1s ease;
					}
					.pnt-cx-table tbody tr:hover {
						background: rgba(123, 104, 238, 0.12) !important;
					}
					.pnt-cx-table tbody td {
						padding: 4px 8px;
						white-space: nowrap;
						vertical-align: middle;
					}
					.pnt-badge-ask {
						background: rgba(239, 68, 68, 0.16);
						color: #fca5a5;
						border: 1px solid rgba(239, 68, 68, 0.35);
						padding: 1px 5px;
						border-radius: 3px;
						font-weight: 700;
						font-size: 9px;
						letter-spacing: 0.5px;
					}
					.pnt-badge-bid {
						background: rgba(34, 197, 94, 0.16);
						color: #86efac;
						border: 1px solid rgba(34, 197, 94, 0.35);
						padding: 1px 5px;
						border-radius: 3px;
						font-weight: 700;
						font-size: 9px;
						letter-spacing: 0.5px;
					}
					.pnt-badge-ticker {
						font-weight: 800;
						color: #d8b4fe;
						font-size: 11px;
						letter-spacing: 0.5px;
					}
					.pnt-cx-btn {
						background: #1e1b4b;
						color: #c7d2fe;
						border: 1px solid rgba(123, 104, 238, 0.4);
						border-radius: 3px;
						padding: 2px 7px;
						cursor: pointer;
						font-weight: 600;
						font-size: 10px;
						transition: all 0.15s ease;
					}
					.pnt-cx-btn:hover {
						background: #312e81;
						color: #ffffff;
						border-color: #7b68ee;
					}
				</style>

				<!-- Toolbar -->
				<div style="padding: 4px 6px; background: #13141f; border: 1px solid rgba(123, 104, 238, 0.25); border-radius: 4px; display: flex; gap: 6px; flex-shrink: 0; align-items: center; margin-bottom: 4px;">
					<span style="font-weight: 800; color: #a78bfa; font-size: 11px; letter-spacing: 0.5px; margin-right: 4px;">PNT CX</span>
					
					<input type="text" id="pnt-search" placeholder="Search ticker, material, vendor, or location..." style="background: #08090f; color: #f1f5f9; border: 1px solid rgba(123, 104, 238, 0.3); border-radius: 3px; padding: 3px 8px; flex-grow: 1; outline: none; font-size: 10px; font-family: inherit;">
					
					<select id="pnt-type-filter" style="background: #08090f; color: #cbd5e1; border: 1px solid rgba(123, 104, 238, 0.3); border-radius: 3px; padding: 3px 6px; font-size: 10px; outline: none; cursor: pointer;">
						<option value="ALL">All Types</option>
						<option value="SELL">SELL (Ask)</option>
						<option value="BUY">BUY (Bid)</option>
					</select>

					<select id="pnt-location-filter" style="background: #08090f; color: #cbd5e1; border: 1px solid rgba(123, 104, 238, 0.3); border-radius: 3px; padding: 3px 6px; font-size: 10px; outline: none; cursor: pointer; max-width: 150px;">
						<option value="ALL">All Locations</option>
					</select>

					<button id="pnt-refresh" class="pnt-cx-btn" title="Refresh market data from PUNoted">
						↻ Refresh
					</button>
				</div>

				<!-- Table Container -->
				<div style="flex: 1 1 0; overflow-y: auto; overflow-x: auto; background: rgba(10, 11, 18, 0.85); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 4px;">
					<table class="pnt-cx-table">
						<thead>
							<tr>
								<th data-sort="ticker">Material</th>
								<th data-sort="type">Type</th>
								<th data-sort="companyCode">Vendor</th>
								<th data-sort="amount" style="text-align: right;">Amount</th>
								<th data-sort="price" style="text-align: right;">Price (ICA)</th>
								<th data-sort="total" style="text-align: right;">Total (ICA)</th>
								<th data-sort="location">Location</th>
							</tr>
						</thead>
						<tbody id="pnt-table-body"></tbody>
					</table>
				</div>
			`;
		}

		bindElements() {
			this.tbody = this.container.querySelector("#pnt-table-body");
			this.searchInput = this.container.querySelector("#pnt-search");
			this.typeSelect = this.container.querySelector("#pnt-type-filter");
			this.locationSelect = this.container.querySelector("#pnt-location-filter");
			this.refreshBtn = this.container.querySelector("#pnt-refresh");
			this.sortHeaders = this.container.querySelectorAll("th[data-sort]");
		}

		updateLocationOptions(locations, selectedLocation) {
			let html = '<option value="ALL">All Locations</option>';
			locations.forEach((loc) => {
				const isSelected = loc === selectedLocation ? "selected" : "";
				html += `<option value="${loc}" ${isSelected}>${loc}</option>`;
			});
			this.locationSelect.innerHTML = html;
		}

		renderLoading() {
			this.tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #a78bfa;">Loading PUNoted vendors...</td></tr>`;
		}

		renderError(errorMessage) {
			this.tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #f87171;">Error loading vendor data: ${errorMessage}</td></tr>`;
		}

		renderRows(orders) {
			if (orders.length === 0) {
				this.tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: rgba(255,255,255,0.4);">No orders matching criteria.</td></tr>`;
				return;
			}

			this.tbody.innerHTML = orders
				.map((o) => {
					const isBuy = o.type === "BUY";
					const badgeClass = isBuy ? "pnt-badge-bid" : "pnt-badge-ask";
					const badgeText = isBuy ? "BUY" : "SELL";

					return `
						<tr>
							<td>
								<span class="pnt-badge-ticker">${o.ticker}</span>
								<span style="font-size: 10px; color: rgba(255,255,255,0.45); margin-left: 4px;">${o.name}</span>
							</td>
							<td><span class="${badgeClass}">${badgeText}</span></td>
							<td>
								<span style="color: #a78bfa; font-weight: 700;">${o.companyCode}</span>
								<span style="font-size: 9px; color: rgba(255,255,255,0.4); margin-left: 3px;">${o.operatorName}</span>
							</td>
							<td style="text-align: right; font-weight: 600;">${o.amount.toLocaleString()}</td>
							<td style="text-align: right; font-weight: 700; color: #38bdf8;">${o.price.toFixed(2)}</td>
							<td style="text-align: right; color: #94a3b8;">${o.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
							<td style="color: #cbd5e1;">${o.location}</td>
						</tr>
					`;
				})
				.join("");
		}
	}

	// =========================================================================
	// 5. APPLICATION CONTROLLER LAYER
	// =========================================================================
	class CxController {
		constructor(container) {
			this.store = new CxStateStore();
			this.view = new CxView(container);
			this.initEventListeners();
			this.loadData();
		}

		initEventListeners() {
			this.view.searchInput.addEventListener("input", (e) => {
				this.store.setSearch(e.target.value);
				this.updateTable();
			});

			this.view.typeSelect.addEventListener("change", (e) => {
				this.store.setTypeFilter(e.target.value);
				this.updateTable();
			});

			this.view.locationSelect.addEventListener("change", (e) => {
				this.store.setLocationFilter(e.target.value);
				this.updateTable();
			});

			this.view.refreshBtn.addEventListener("click", () => {
				this.loadData();
			});

			this.view.sortHeaders.forEach((th) => {
				th.addEventListener("click", () => {
					const column = th.dataset.sort;
					this.store.toggleSort(column);
					this.updateTable();
				});
			});
		}

		async loadData() {
			this.store.setLoading(true);
			this.view.renderLoading();

			try {
				const orders = await CxApiService.fetchVendorOrders();
				this.store.setOrders(orders);
				this.view.updateLocationOptions(this.store.getUniqueLocations(), this.store.filters.location);
				this.updateTable();
			} catch (err) {
				console.error("[PNT CX] Fetch Error:", err);
				this.store.setError(err.message);
				this.view.renderError(err.message);
			}
		}

		updateTable() {
			const visibleOrders = this.store.getFilteredAndSortedOrders();
			this.view.renderRows(visibleOrders);
		}
	}

	// =========================================================================
	// 6. PLATFORM DRIVER (APEX OBSERVER & BUFFER INJECTOR)
	// =========================================================================
	function mountCorpApp(tileNode) {
		const tileBody = tileNode.querySelector('div[class*="TileFrame__body"]');
		if (!tileBody || tileBody.dataset.hijacked === "true") return;

		tileBody.dataset.hijacked = "true";
		tileBody.innerHTML = "";

		const appContainer = document.createElement("div");
		tileBody.appendChild(appContainer);

		// Initialize MVP Module
		new CxController(appContainer);
	}

	async function executeNativeBufferCommand(commandStr) {
		const newBfrBtn = document.getElementById("TOUR_TARGET_BUTTON_BUFFER_NEW");
		if (!newBfrBtn) return;
		newBfrBtn.click();

		let cmdInput = null;
		for (let i = 0; i < 20; i++) {
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
		Object.getOwnPropertyDescriptor(
			window.HTMLInputElement.prototype,
			"value"
		).set.call(cmdInput, commandStr);

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

	function injectCorpExchangeIntoCXL() {
		document.querySelectorAll(".rp-command-CXL").forEach((frame) => {
			const tbody = frame.querySelector("table tbody");
			if (!tbody || tbody.querySelector("#corp-exchange-row")) return;

			const tr = document.createElement("tr");
			tr.id = "corp-exchange-row";
			tr.innerHTML = `
				<td><span class="Link__link___fa4mmMA" style="color: #5bc0de; font-weight: bold; cursor: pointer;">[CUSTOM] Corporation Exchange</span></td>
				<td>CORP</td>
				<td><span class="Link__link___fa4mmMA">Syndicate</span></td>
				<td><span class="Link__link___fa4mmMA"><span>Global Network</span></span></td>
			`;

			tr.querySelector("span").addEventListener("click", () => {
				executeNativeBufferCommand("XIT PNT_CORP");
			});
			tbody.appendChild(tr);
		});
	}

	function injectIntoXitCmds(tileNode) {
		const tbody = tileNode.querySelector("table tbody");
		if (!tbody || tbody.querySelector("#custom-cmd-pnt-all")) return;

		const tr = document.createElement("tr");
		tr.id = "custom-cmd-pnt-all";
		tr.innerHTML = `
			<td style="padding: 4px; font-weight: bold; color: #f0ad4e;">PNT_CORP</td>
			<td style="padding: 4px; color: #ddd;">Corporation Exchange Market</td>
		`;
		tbody.appendChild(tr);
	}

	function observeXitBuffers() {
		let observerTimeout = null;
		const observer = new MutationObserver(() => {
			if (observerTimeout) return;
			observerTimeout = setTimeout(() => {
				document.querySelectorAll('div[class*="TileFrame__frame"]').forEach((tile) => {
					const cmdEl = tile.querySelector('div[class*="TileFrame__cmd"]');
					if (!cmdEl) return;
					const cmdText = cmdEl.textContent.trim().toUpperCase();
					if (cmdText === "XIT PNT_CORP") mountCorpApp(tile);
					if (cmdText === "XIT CMDS") injectIntoXitCmds(tile);
				});
				observerTimeout = null;
			}, 800);
		});

		if (document.body) {
			observer.observe(document.body, { childList: true, subtree: true });
		} else {
			document.addEventListener("DOMContentLoaded", () => {
				if (document.body) observer.observe(document.body, { childList: true, subtree: true });
			});
		}
	}

	// Bootstrap
	setInterval(injectCorpExchangeIntoCXL, 2000);
	observeXitBuffers();
})();
