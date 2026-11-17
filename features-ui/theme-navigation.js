const APEX_THEME_NAVIGATION = `
    /* 1. TOP APP BAR & SCREEN TABS */
    div[class*="AppBar__container"],
    div[class*="ScreenControls__container"],
    div[class*="Head__container"],
    header {
        background: linear-gradient(135deg, #070718 0%, #0d0d28 100%) !important;
        border-bottom: 1px solid rgba(123, 104, 238, 0.35) !important;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.6) !important;
    }

    div[class*="HeadItem__container"] {
        color: #cbd5e1 !important;
    }

    div[class*="ContextControls__activeContext"],
    div[class*="ScreenControls__currentScreenName"] {
        color: #a78bfa !important;
        font-weight: 700 !important;
        text-shadow: 0 0 8px rgba(167, 139, 250, 0.4) !important;
    }

    div[class*="ScreenControls__screen"],
    div[class*="ContextControls__context"],
    div[class*="Tab__tab"],
    div[class*="rp-TabBar__item"] {
        background: rgba(14, 14, 36, 0.8) !important;
        color: #94a3b8 !important;
        border: 1px solid rgba(123, 104, 238, 0.2) !important;
        border-radius: 4px !important;
        transition: all 0.2s ease !important;
    }

    div[class*="ScreenControls__screen"]:hover,
    div[class*="ContextControls__context"]:hover,
    div[class*="rp-TabBar__item"]:hover {
        background: rgba(123, 104, 238, 0.2) !important;
        color: #a78bfa !important;
        border-color: rgba(123, 104, 238, 0.4) !important;
    }

    div[class*="ScreenControls__active"],
    div[class*="ContextControls__active"],
    div[class*="Tab__active"] {
        background: linear-gradient(135deg, rgba(123, 104, 238, 0.3) 0%, rgba(91, 70, 224, 0.4) 100%) !important;
        color: #e9d5ff !important;
        font-weight: 700 !important;
        border-bottom: 2px solid #7b68ee !important;
        box-shadow: 0 0 10px rgba(123, 104, 238, 0.3) !important;
    }

    /* 2. LEFT SIDEBAR COMMAND NAV */
    div[class*="Frame__sidebar"],
    div[class*="Cmd__container"],
    div[class*="LeftNav__container"],
    div[class*="Navigation__container"] {
        background: #040410 !important;
        border-right: 1px solid rgba(123, 104, 238, 0.25) !important;
    }

    div[class*="Frame__toggle"] {
        transition: all 0.15s ease !important;
    }

    div[class*="Frame__toggle"]:hover {
        background: rgba(123, 104, 238, 0.15) !important;
        border-radius: 4px !important;
    }

    div[class*="Frame__toggleLabel"] {
        color: #94a3b8 !important;
    }

    div[class*="Frame__toggle"]:hover div[class*="Frame__toggleLabel"] {
        color: #a78bfa !important;
    }

    div[class*="Frame__toggleIndicatorActive"],
    div[class*="Frame__toggleIndicatorPrimaryActive"] {
        background: #7b68ee !important;
        box-shadow: 0 0 8px #7b68ee !important;
    }

    div[class*="Frame__title"] {
        color: #7b68ee !important;
        font-weight: 700 !important;
        letter-spacing: 0.05em !important;
    }

    /* 2B. BOTTOM DOCK & FOOTER BAR */
    div[class*="Frame__foot"] {
        background: linear-gradient(135deg, #070718 0%, #0d0d28 100%) !important;
        border-top: 1px solid rgba(123, 104, 238, 0.35) !important;
        color: #94a3b8 !important;
    }

    div[class*="Dock__item"],
    div[class*="Dock__create"] {
        background: rgba(14, 14, 36, 0.8) !important;
        color: #a78bfa !important;
        border: 1px solid rgba(123, 104, 238, 0.25) !important;
        border-radius: 4px !important;
        font-weight: 700 !important;
        transition: all 0.15s ease !important;
    }

    div[class*="Dock__item"]:hover,
    div[class*="Dock__create"]:hover {
        background: rgba(123, 104, 238, 0.25) !important;
        color: #c4b5fd !important;
        border-color: rgba(123, 104, 238, 0.5) !important;
        box-shadow: 0 0 8px rgba(123, 104, 238, 0.3) !important;
    }

    div[class*="UsersOnlineCount__container"] {
        color: #94a3b8 !important;
    }

    div[class*="UsersOnlineCount__container"] span {
        color: #a78bfa !important;
        font-weight: 700 !important;
    }

    div[class*="HeadItem__indicatorSuccess"] {
        background-color: #69f0ae !important;
        box-shadow: 0 0 6px rgba(105, 240, 174, 0.6) !important;
    }
`;
