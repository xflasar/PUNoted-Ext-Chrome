const APEX_THEME_SITE_PRODUCTION = `
    /* 4D. SITE PRODUCTION LINES & ORDER QUEUE SLOTS */
    h2[class*="Site__header"],
    div[class*="Site__infoHeader"],
    h2[class*="Site__workforcesHeader"] {
        background: linear-gradient(135deg, rgba(123, 104, 238, 0.25) 0%, rgba(90, 72, 204, 0.3) 100%) !important;
        color: #e9d5ff !important;
        border-left: 3px solid #7b68ee !important;
        border-bottom: 1px solid rgba(123, 104, 238, 0.3) !important;
        border-radius: 4px !important;
        font-weight: 700 !important;
        letter-spacing: 0.03em !important;
        transition: all 0.15s ease !important;
    }

    /* 4D. SITE PRODUCTION LINES & COMPACT ORDER CARDS */
    div[class*="SiteProductionLines__container"] {
        background: #030309 !important;
    }

    div[class*="SiteProductionLines__grid"] {
        display: grid !important;
        grid-template-rows: auto 1fr !important;
        align-items: start !important;
    }

    div[class*="SiteProductionLines__columnBase"] {
        border-right: 1px solid rgba(123, 104, 238, 0.2) !important;
        background-color: rgba(6, 6, 18, 0.6) !important;
        box-sizing: border-box !important;
    }

    div[class*="SiteProductionLines__header"] {
        position: sticky !important;
        top: 0 !important;
        z-index: 10 !important;
        background: linear-gradient(135deg, rgba(22, 22, 54, 0.98) 0%, rgba(12, 12, 32, 0.98) 100%) !important;
        border-bottom: 1px solid rgba(123, 104, 238, 0.35) !important;
        border-radius: 0 !important;
        display: flex !important;
        flex-direction: column !important;
    }

    div[class*="SiteProductionLines__headerName"] {
        color: #a78bfa !important;
        font-weight: 700 !important;
        font-size: 0.9rem !important;
        letter-spacing: 0.04em !important;
    }

    div[class*="SiteProductionLines__headerActions"] {
        display: flex !important;
        flex-direction: row !important;
        justify-content: flex-start !important;
        gap: 6px !important;
        border-top: 1px solid rgba(123, 104, 238, 0.2) !important;
    }

    div[class*="SiteProductionLines__column"] {
        display: grid !important;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)) !important;
        align-content: start !important;
        gap: 6px !important;
        box-sizing: border-box !important;
    }

    div[class*="SiteProductionLines__slotDivider"] {
        grid-column: 1 / -1 !important;
        background: linear-gradient(90deg, rgba(123, 104, 238, 0.3) 0%, rgba(10, 10, 26, 0.8) 100%) !important;
        color: #a78bfa !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.08em !important;
        border-radius: 3px !important;
        font-size: 10px !important;
        text-align: left !important;
    }

    div[class*="OrderSlot__container"] {
        position: relative !important;
        background: rgba(14, 14, 34, 0.85) !important;
        border: 1px solid rgba(123, 104, 238, 0.25) !important;
        border-radius: 4px !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        overflow: hidden !important;
        transition: all 0.15s ease !important;
    }

    div[class*="OrderSlot__container"]:hover {
        border-color: #7b68ee !important;
        background: rgba(123, 104, 238, 0.2) !important;
        box-shadow: 0 2px 8px rgba(123, 104, 238, 0.3) !important;
    }

    div[class*="OrderSlot__progress"] {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        bottom: 0 !important;
        background: linear-gradient(90deg, rgba(123, 104, 238, 0.45) 0%, rgba(90, 72, 204, 0.55) 100%) !important;
        border-right: 2px solid #7b68ee !important;
        pointer-events: none !important;
        z-index: 1 !important;
    }

    div[class*="OrderSlot__content"] {
        position: relative !important;
        z-index: 2 !important;
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
    }

    div[class*="OrderSlot__info"] {
        display: flex !important;
        flex-direction: column !important;
        gap: 0px !important;
        font-size: 10.5px !important;
        color: #cbd5e1 !important;
    }

    div[class*="OrderSlot__info"] span:nth-child(1) {
        font-weight: 700 !important;
        color: #f1f5f9 !important;
    }

    span[class*="OrderStatus__error"],
    .OrderStatus__error___tUbpK5Q {
        color: #f87171 !important;
        font-weight: 700 !important;
        text-shadow: 0 0 6px rgba(248, 113, 113, 0.4) !important;
    }
`;
