const APEX_THEME_GLOBAL_BASE = `
    /* 0. GLOBAL BASE OVERRIDES */
    body, html, #container {
        background-color: #030309 !important;
        color: #cbd5e1 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif !important;
    }

    div[class*="MainState__container"],
    div[class*="LoadingState__container"] {
        background-color: #030309 !important;
        color: #cbd5e1 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif !important;
    }

    div[class*="LoadingState__title"] {
        color: #a78bfa !important;
        text-shadow: 0 0 12px rgba(167, 139, 250, 0.4) !important;
    }

    div[class*="LoadingState__text"] {
        color: #94a3b8 !important;
    }

    div[class*="Indicator__indicator"][class*="Indicator__enabled"] {
        background-color: #7b68ee !important;
        box-shadow: 0 0 10px rgba(123, 104, 238, 0.6) !important;
    }

    div[class*="Indicator__value"] {
        color: #cbd5e1 !important;
    }
`;
