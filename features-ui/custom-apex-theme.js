function applyCustomApexTheme(enabled) {
    let styleEl = document.getElementById('punoted-custom-apex-theme');
    if (enabled) {
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'punoted-custom-apex-theme';
            styleEl.textContent = [
                APEX_THEME_GLOBAL_BASE,
                APEX_THEME_NAVIGATION,
                APEX_THEME_TILES_WINDOWS,
                APEX_THEME_CONTROLS_CONTROLS,
                APEX_THEME_SITE_PRODUCTION,
                APEX_THEME_TABLES_FORMS,
                APEX_THEME_TOOLTIPS_EFFECTS
            ].join('\n');
            (document.head || document.documentElement).appendChild(styleEl);
        }
    } else if (styleEl) {
        styleEl.remove();
    }
}
