const APEX_THEME_TILES_WINDOWS = `
    /* 3. TILE FRAMES & FLOATING WINDOW CONTAINERS */
    div[class*="TileFrame__frame"],
    div[class*="Window__container"],
    div[class*="Window__window"] {
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.85), 0 0 20px rgba(123, 104, 238, 0.25) !important;
        border: 1px solid rgba(123, 104, 238, 0.35) !important;
        border-radius: 8px !important;
        background: linear-gradient(135deg, rgba(10, 10, 26, 0.98) 0%, rgba(5, 5, 14, 0.98) 100%) !important;
    }

    /* Keep marquee multiselect visible and styled in APEX Theme */
    div[class*="InventoryView__marquee"] {
        position: fixed !important;
        border: 1px dashed #a78bfa !important;
        background: rgba(123, 104, 238, 0.25) !important;
        box-shadow: 0 0 10px rgba(123, 104, 238, 0.4) !important;
        pointer-events: none !important;
        z-index: 999999 !important;
        display: block !important;
        visibility: visible !important;
    }

    div[class*="TileFrame__header"],
    div[class*="Window__header"] {
        background: linear-gradient(135deg, rgba(22, 22, 54, 0.98) 0%, rgba(12, 12, 32, 0.98) 100%) !important;
        border-bottom: 1px solid rgba(123, 104, 238, 0.35) !important;
        color: #e9d5ff !important;
        display: flex !important;
        align-items: center !important;
    }

    div[class*="TileFrame__title"],
    div[class*="Window__title"] {
        font-weight: 700 !important;
        color: #f8fafc !important;
        letter-spacing: 0.04em !important;
        text-shadow: 0 0 8px rgba(255, 255, 255, 0.2) !important;
    }

    div[class*="TileFrame__cmd"] {
        color: #a78bfa !important;
        font-weight: 600 !important;
    }

    div[class*="TileFrame__body"],
    div[class*="Window__body"] {
        background: rgba(4, 4, 12, 0.92) !important;
        color: #cbd5e1 !important;
    }

    div[class*="Window__button"] {
        color: #a78bfa !important;
        transition: all 0.15s ease !important;
        cursor: pointer !important;
        border-radius: 4px !important;
    }

    div[class*="Window__button"]:hover {
        color: #a78bfa !important;
        background: rgba(123, 104, 238, 0.3) !important;
        box-shadow: 0 0 10px rgba(167, 139, 250, 0.4) !important;
    }

    div[class*="SectionHeader__container"],
    header[class*="SectionHeader__container"],
    .SectionHeader__container___UXuTs3A,
    h2[class*="FinanceOverviewPanel__header"],
    h2[class*="ui__header2"] {
        background: linear-gradient(135deg, rgba(22, 22, 54, 0.98) 0%, rgba(12, 12, 32, 0.98) 100%) !important;
        border-left: 2px solid #7b68ee !important;
        border-bottom: 1px solid rgba(123, 104, 238, 0.25) !important;
        color: #e9d5ff !important;
        border-radius: 3px !important;
        font-weight: 700 !important;
        font-size: 11px !important;
        letter-spacing: 0.03em !important;
        padding: 2px 6px !important;
        margin: 2px 0 !important;
    }

    /* 3C. KEY FIGURES & METRIC CARDS (COMPACT) */
    div[class*="figures__container"],
    div[class*="FinanceOverviewPanel__data"] {
        display: flex !important;
        flex-wrap: wrap !important;
        margin: 2px -1px !important;
    }

    div[class*="figures__figure"],
    div[class*="FinanceOverviewPanel__info"] {
        background: linear-gradient(135deg, rgba(16, 16, 38, 0.85) 0%, rgba(8, 8, 20, 0.85) 100%) !important;
        border: 1px solid rgba(123, 104, 238, 0.2) !important;
        border-radius: 3px !important;
        margin: 1px !important;
        padding: 2px 4px !important;
        min-width: 90px !important;
        width: calc(25% - 2px) !important;
        max-width: 140px !important;
        box-sizing: border-box !important;
        transition: border-color 0.15s ease, background 0.15s ease !important;
    }

    div[class*="figures__figure"]:hover,
    div[class*="FinanceOverviewPanel__info"]:hover {
        border-color: #7b68ee !important;
        background: linear-gradient(135deg, rgba(24, 24, 52, 0.95) 0%, rgba(12, 12, 28, 0.95) 100%) !important;
    }

    div[class*="figures__figure"] > span,
    div[class*="FinanceOverviewPanel__info"] > span {
        color: #f8fafc !important;
        font-weight: 700 !important;
        font-size: 11px !important;
        letter-spacing: -0.2px !important;
        display: block !important;
        line-height: 14px !important;
        white-space: nowrap !important;
    }

    div[class*="figures__label"],
    div[class*="FinanceOverviewPanel__label"] {
        color: #a78bfa !important;
        font-size: 8.5px !important;
        font-weight: 600 !important;
        margin-top: 1px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.3px !important;
        line-height: 11px !important;
        white-space: nowrap !important;
    }

    div[class*="figures__label"] span[class*="Tooltip__container"],
    div[class*="FinanceOverviewPanel__label"] span[class*="Tooltip__container"] {
        color: #c4b5fd !important;
        font-size: 8px !important;
        opacity: 0.75 !important;
    }

    /* 3B. CONTEXT CONTROLS & HEADER STRIPS */
    div[class*="ContextControls__container"] {
        background: rgba(10, 10, 26, 0.9) !important;
        border-bottom: 1px solid rgba(123, 104, 238, 0.25) !important;
    }

    div[class*="ContextControls__item"]:hover {
        border-color: rgba(123, 104, 238, 0.4) !important;
        color: #7b68ee !important;
    }

    div[class*="ContextControls__item"]:hover span[class*="ContextControls__cmd"] {
        color: #c4b5fd !important;
    }

    div[class*="ContextControls__item"]:hover span[class*="ContextControls__label"] {
        color: #cbd5e1 !important;
    }

    span[class*="ContextControls__cmd"] {
        color: #a78bfa !important;
        font-weight: 700 !important;
    }

    span[class*="ContextControls__label"] {
        color: #94a3b8 !important;
        transition: color 0.15s ease !important;
    }

    /* 4. WINDOW HEADER CONTROLS & BUTTONS */
    div[class*="TileControls__control"],
    div[class*="TileControlsButton__button"],
    button[class*="TileControlsButton__button"],
    span[class*="TileControls__control"],
    i[class*="rp-font-awesome"] {
        color: #a78bfa !important;
        background-color: transparent !important;
        fill: #a78bfa !important;
        opacity: 0.85 !important;
        transition: all 0.15s ease !important;
    }

    div[class*="TileFrame__controls"] {
        background-color: rgba(10, 10, 26, 0.9) !important;
    }

    div[class*="TileControls__control"]:hover,
    button[class*="TileControls__control"]:hover,
    span[class*="TileControls__control"]:hover {
        color: #a78bfa !important;
        fill: #a78bfa !important;
        background: transparent !important;
        background-color: transparent !important;
        opacity: 1 !important;
        border-radius: 3px !important;
    }
`;
