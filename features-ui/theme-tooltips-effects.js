const APEX_THEME_TOOLTIPS_EFFECTS = `
    /* 10. TOOLTIPS OVERHAUL */
    [data-tooltip]:before {
        background: linear-gradient(135deg, rgba(12, 12, 32, 0.98) 0%, rgba(4, 4, 14, 0.98) 100%) !important;
        color: #f1f5f9 !important;
        border: 1px solid rgba(123, 104, 238, 0.4) !important;
        border-radius: 6px !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.75), 0 0 10px rgba(123, 104, 238, 0.25) !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
    }

    [data-tooltip-position="top"]:after {
        border-top-color: #7b68ee !important;
    }

    [data-tooltip-position="bottom"]:after {
        border-bottom-color: #7b68ee !important;
    }

    [data-tooltip-position="left"]:after {
        border-left-color: #7b68ee !important;
    }

    [data-tooltip-position="right"]:after {
        border-right-color: #7b68ee !important;
    }

    /* 11. GLOW EFFECTS & ANIMATION OVERRIDES */
    div[class*="effects__shadowPrimary"],
    .effects__shadowPrimary___EbXJQor {
        box-shadow: 0 0 10px rgba(123, 104, 238, 0.6) !important;
    }

    div[class*="effects__shadowSecondary"],
    .effects__shadowSecondary___a1b2c3d {
        box-shadow: 0 0 10px rgba(0, 229, 255, 0.6) !important;
    }

    div[class*="effects__insetShadowPrimary"] {
        box-shadow: inset 0 0 8px rgba(123, 104, 238, 0.5) !important;
    }
`;
