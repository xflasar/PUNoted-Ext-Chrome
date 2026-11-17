const APEX_THEME_TABLES_FORMS = `
    /* 5. TABLES OVERHAUL & ZEBRA OVERWRITE */
    table,
    div[class*="Table__container"] {
        background: transparent !important;
        border-collapse: separate !important;
        border-spacing: 0 !important;
    }

    table tbody tr td,
    table tbody tr td:nth-child(odd),
    table tbody tr td:nth-child(even),
    div[class*="TileFrame__body"] table tbody tr td:nth-child(odd),
    div[class*="TileFrame__body"] table tbody tr td:nth-child(even),
    div[class*="TileFrame__body"] table tbody tr td {
        background-color: transparent !important;
        background: inherit !important;
        color: #cbd5e1;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
    }

    /* Colored values in tables & panels (e.g. positive green, negative red) */
    [class*="ColoredValue__positive"],
    td[class*="ColoredValue__positive"],
    span[class*="ColoredValue__positive"] {
        color: #4ade80 !important;
        font-weight: 600 !important;
    }

    [class*="ColoredValue__negative"],
    td[class*="ColoredValue__negative"],
    span[class*="ColoredValue__negative"] {
        color: #f87171 !important;
        font-weight: 600 !important;
    }

    table thead tr,
    tr[class*="Table__header"],
    table th {
        background: rgba(14, 14, 36, 0.98) !important;
        border-bottom: 1px solid rgba(123, 104, 238, 0.35) !important;
        color: #94a3b8 !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.05em !important;
    }

    table tbody tr:hover,
    tr[class*="Table__row"]:hover {
        background-color: rgba(123, 104, 238, 0.16) !important;
        transition: background 0.15s ease !important;
    }

    /* BROKER LIST & FLEET TABLE BUTTON GRID (2x2) */
    table[class*="BrokerList__table"] tbody tr td:last-child,
    td:has(> div[class*="Fleet__buttons"]) {
        vertical-align: middle !important;
        align-items: center !important;
    }

    table[class*="BrokerList__table"] tbody tr td:last-child {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 2px !important;
        justify-items: stretch !important;
    }

    table[class*="BrokerList__table"] tbody tr td:last-child button {
        width: 100% !important;
        margin: 0 !important;
        text-align: center !important;
        box-sizing: border-box !important;
        font-size: 9px !important;
        padding: 2px 4px !important;
    }

    /* FLEET ACTION BUTTONS GRID (fly, cargo, fuel, unload) */
    div[class*="Fleet__buttons"] {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 2px !important;
        width: max-content !important;
        min-width: 90px !important;
    }

    div[class*="Fleet__buttons"] button {
        width: 100% !important;
        margin: 0 !important;
        text-align: center !important;
        box-sizing: border-box !important;
        font-size: 10px !important;
        padding: 2px 5px !important;
        background: rgba(123, 104, 238, 0.15) !important;
        color: #c4b5fd !important;
        border: 1px solid rgba(123, 104, 238, 0.3) !important;
        border-radius: 3px !important;
        transition: all 0.15s ease !important;
    }

    div[class*="Fleet__buttons"] button:hover {
        background: #7b68ee !important;
        color: #ffffff !important;
        border-color: #a78bfa !important;
        box-shadow: 0 0 8px rgba(123, 104, 238, 0.5) !important;
    }

    /* 6. FORM CONTROLS, INPUTS, SELECTS & FORMCOMPONENTS */
    /* Form component row containers - PUNoted dark aesthetic with differentiated category colors */
    div[class*="FormComponent__containerActive"],
    div[class*="forms__active"] {
        background-color: rgba(30, 24, 10, 0.85) !important;
        border: none !important;
        box-shadow: none !important;
        margin-bottom: 2px !important;
    }

    div[class*="FormComponent__containerActive"] label,
    div[class*="forms__active"] label {
        background-color: #f59e0b !important;
        color: #0f172a !important;
        font-weight: 700 !important;
        text-shadow: none !important;
    }

    div[class*="FormComponent__containerPassive"],
    div[class*="forms__passive"] {
        background-color: rgba(15, 18, 35, 0.85) !important;
        border: none !important;
        box-shadow: none !important;
        margin-bottom: 2px !important;
    }

    div[class*="FormComponent__containerPassive"] label,
    div[class*="forms__passive"] label {
        background-color: #6366f1 !important;
        color: #ffffff !important;
        font-weight: 700 !important;
        text-shadow: none !important;
    }

    div[class*="FormComponent__containerCommand"],
    div[class*="forms__cmd"] {
        background-color: rgba(18, 18, 28, 0.85) !important;
        border: none !important;
        box-shadow: none !important;
        margin-bottom: 2px !important;
    }

    div[class*="FormComponent__containerCommand"] label,
    div[class*="forms__cmd"] label {
        background-color: #64748b !important;
        color: #0f172a !important;
        font-weight: 700 !important;
        text-shadow: none !important;
    }

    div[class*="FormComponent__containerError"],
    div[class*="forms__error"] {
        background-color: rgba(35, 15, 20, 0.85) !important;
        border: none !important;
        box-shadow: none !important;
        margin-bottom: 2px !important;
    }

    div[class*="FormComponent__containerError"] label,
    div[class*="forms__error"] label {
        background-color: #f43f5e !important;
        color: #ffffff !important;
        font-weight: 700 !important;
        text-shadow: none !important;
    }

    /* FormComponent input & static areas */
    div[class*="forms__input"] div[class*="forms__static"],
    div[class*="StaticInput__static"],
    div[class*="forms__static"] {
        background-color: transparent !important;
        color: #e2e8f0 !important;
        border: none !important;
    }

    div[class*="forms__input"] input,
    div[class*="FormComponent__input"] input {
        background-color: rgba(0, 0, 0, 0.3) !important;
        color: #f1f5f9 !important;
        border: 0 !important;
        border-bottom: 1px solid #7b68ee !important;
        border-radius: 0 !important;
    }

    div[class*="forms__input"] input:focus,
    div[class*="FormComponent__input"] input:focus {
        border-bottom: 1px solid #a78bfa !important;
        box-shadow: 0 1px 4px rgba(123, 104, 238, 0.5) !important;
    }

    /* 6A. AUTOCOMPLETE SUGGESTIONS & ADDRESS SELECTOR POPUPS */
    /* When closed/empty, hide completely so phantom borders/lines never render at z-index 9999 */
    div[class*="suggestions__suggestionsContainer"]:not([class*="suggestionsContainerOpen"]):not(:has(li)),
    div[class*="AddressSelector__suggestionsContainer"]:not([class*="suggestionsContainerOpen"]):not(:has(li)),
    div[id^="react-autowhatever"]:not([class*="suggestionsContainerOpen"]):not(:has(li)) {
        display: none !important;
        border: none !important;
        box-shadow: none !important;
        background: transparent !important;
    }

    div[class*="suggestions__suggestionsContainer"][class*="suggestionsContainerOpen"],
    div[class*="AddressSelector__suggestionsContainer"][class*="suggestionsContainerOpen"],
    div[id^="react-autowhatever"][class*="suggestionsContainerOpen"],
    div[class*="suggestions__suggestionsContainer"]:has(li),
    div[class*="AddressSelector__suggestionsContainer"]:has(li),
    div[id^="react-autowhatever"]:has(li) {
        background: linear-gradient(135deg, rgba(14, 14, 34, 0.98) 0%, rgba(8, 8, 20, 0.98) 100%) !important;
        border: 1px solid rgba(123, 104, 238, 0.45) !important;
        border-radius: 6px !important;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.85), 0 0 15px rgba(123, 104, 238, 0.25) !important;
        backdrop-filter: blur(12px) !important;
        -webkit-backdrop-filter: blur(12px) !important;
    }

    div[class*="suggestions__sectionTitle"],
    div[class*="AddressSelector__sectionTitle"] {
        background: rgba(22, 22, 54, 0.9) !important;
        color: #a78bfa !important;
        border-bottom: 1px solid rgba(123, 104, 238, 0.25) !important;
        border-top: 1px solid rgba(123, 104, 238, 0.15) !important;
        padding: 4px 8px !important;
        font-size: 10px !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.05em !important;
    }

    div[class*="suggestions__sectionContainer"]:first-child div[class*="suggestions__sectionTitle"],
    div[class*="AddressSelector__sectionContainer"]:first-child div[class*="AddressSelector__sectionTitle"] {
        border-top: none !important;
    }

    ul[class*="suggestions__suggestionsList"],
    ul[class*="AddressSelector__suggestionsList"] {
        list-style: none !important;
        padding: 0 !important;
        margin: 0 !important;
    }

    li[class*="suggestions__suggestion"],
    li[class*="AddressSelector__suggestion"] {
        padding: 5px 8px !important;
        color: #e2e8f0 !important;
        font-size: 11px !important;
        cursor: pointer !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.04) !important;
        transition: background-color 0.12s ease, color 0.12s ease !important;
    }

    li[class*="AddressSelector__suggestion"] {
        display: flex !important;
        align-items: center !important;
    }

    li[class*="suggestions__suggestion"]:hover,
    li[class*="AddressSelector__suggestion"]:hover,
    li[class*="suggestions__suggestion--focused"],
    li[class*="AddressSelector__suggestion--focused"],
    li[class*="suggestions__suggestion"][aria-selected="true"],
    li[class*="AddressSelector__suggestion"][aria-selected="true"] {
        background: rgba(123, 104, 238, 0.25) !important;
        color: #f8fafc !important;
    }

    div[class*="AddressSelector__suggestionContent"] {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        width: 100% !important;
    }

    img[class*="AddressTypeIcon__icon"] {
        filter: drop-shadow(0 0 4px rgba(123, 104, 238, 0.5)) !important;
    }

    /* General Standalone Inputs, Textareas and Selects */
    input[type="text"]:not([class*="forms__input"]):not([class*="FormComponent__input"]),
    input[type="number"]:not([class*="forms__input"]):not([class*="FormComponent__input"]),
    input[type="search"],
    select:not([class*="DynamicInput__dynamic"] select),
    textarea {
        background-color: rgba(123, 104, 238, 0.08) !important;
        color: #f1f5f9 !important;
        border: none !important;
        border-bottom: 1px solid rgba(123, 104, 238, 0.35) !important;
        border-radius: 3px !important;
        outline: none !important;
        transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease !important;
    }

    select option {
        background-color: #0d0d24 !important;
        color: #f1f5f9 !important;
    }

    input[type="text"]:not([class*="forms__input"]):focus,
    input[type="number"]:not([class*="forms__input"]):focus,
    input[type="search"]:focus,
    select:focus,
    textarea:focus {
        background-color: rgba(123, 104, 238, 0.16) !important;
        border-bottom: 1px solid #a78bfa !important;
        box-shadow: 0 1px 6px rgba(123, 104, 238, 0.3) !important;
    }

    /* 6B. PROGRESS BARS & RANGE BARS (MATCH NATIVE APEX PRECISION) */
    progress,
    progress[class*="ProgressBar"],
    div[class*="ProgressBar__container"] progress,
    div[class*="RangeBar"] progress {
        background-color: #262626 !important;
        border-radius: 0px !important;
        border: 1px solid #999999 !important;
        overflow: hidden !important;
        height: 9px !important;
    }

    progress::-webkit-progress-bar {
        background-color: #262626 !important;
        border-radius: 0px !important;
    }

    /* Primary Progress Bar (Orange) */
    progress[class*="primary"]::-webkit-progress-value,
    progress[class*="ProgressBar__primary"]::-webkit-progress-value {
        background-color: #f7a600 !important;
        background: #f7a600 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
    }

    progress[class*="primary"]::-moz-progress-bar,
    progress[class*="ProgressBar__primary"]::-moz-progress-bar {
        background-color: #f7a600 !important;
        background: #f7a600 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
    }

    /* Secondary Progress Bar (Cyan) */
    progress[class*="secondary"]::-webkit-progress-value,
    progress[class*="ProgressBar__secondary"]::-webkit-progress-value {
        background-color: #3fa2de !important;
        background: #3fa2de !important;
        border-radius: 0 !important;
        box-shadow: none !important;
    }

    progress[class*="secondary"]::-moz-progress-bar,
    progress[class*="ProgressBar__secondary"]::-moz-progress-bar {
        background-color: #3fa2de !important;
        background: #3fa2de !important;
        border-radius: 0 !important;
        box-shadow: none !important;
    }

    div[class*="ProgressBar__container"] {
        display: inline-flex !important;
        align-items: center !important;
        gap: 6px !important;
    }

    div[class*="ProgressBar__container"] span,
    span[class*="ProgressBar__progressLabel"] {
        font-size: 11px !important;
        font-weight: 700 !important;
        color: #cbd5e1 !important;
    }

    /* 7. BUTTONS OVERHAUL */
    /* Target primary action buttons without affecting compact inline utility/form buttons */
    button[class*="Button__btn"]:not([class*="Button__disabled"]):not([disabled]):not([class*="Button__unavailable"]):not([class*="Button__restricted"]):not([class*="Button__inline"]):not([class*="Button__dark"]):not([class*="forms__btnNeutral"]),
    button[class*="Button__primary"]:not([class*="Button__disabled"]):not([disabled]):not([class*="Button__unavailable"]):not([class*="Button__restricted"]):not([class*="Button__inline"]),
    .cart-add-btn {
        background: linear-gradient(135deg, #7b68ee 0%, #5b46e0 100%) !important;
        color: #ffffff !important;
        border: 1px solid rgba(255, 255, 255, 0.15) !important;
        border-radius: 4px !important;
        font-weight: 600 !important;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4) !important;
        box-shadow: 0 2px 8px rgba(123, 104, 238, 0.3) !important;
        transition: all 0.2s ease !important;
        cursor: pointer !important;
    }

    button[class*="Button__btn"]:not([class*="Button__disabled"]):not([disabled]):not([class*="Button__unavailable"]):not([class*="Button__restricted"]):not([class*="Button__inline"]):not([class*="Button__dark"]):not([class*="forms__btnNeutral"]):hover,
    button[class*="Button__primary"]:not([class*="Button__disabled"]):not([disabled]):not([class*="Button__unavailable"]):not([class*="Button__restricted"]):not([class*="Button__inline"]):hover,
    .cart-add-btn:hover {
        background: linear-gradient(135deg, #8b79f2 0%, #6c57ea 100%) !important;
        box-shadow: 0 4px 14px rgba(123, 104, 238, 0.5) !important;
        filter: brightness(1.1) !important;
        transform: translateY(-1px) !important;
    }

    /* Small Inline & Quick Action Buttons (e.g. ANT, BEN, HRT, MOR presets) - Keep clean APEX compact styling */
    button[class*="Button__darkInline"],
    button[class*="Button__dark"],
    button[class*="Button__inline"] {
        background-color: #333333 !important;
        color: #aaaaaa !important;
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        text-shadow: none !important;
        font-weight: normal !important;
        transform: none !important;
    }

    button[class*="Button__darkInline"]:hover,
    button[class*="Button__dark"]:hover,
    button[class*="Button__inline"]:hover {
        background-color: #f7a600 !important;
        color: #272727 !important;
        box-shadow: none !important;
        transform: none !important;
        filter: none !important;
    }

    button[class*="Button__danger"]:not([class*="Button__disabled"]):not([disabled]) {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
        border-color: rgba(239, 68, 68, 0.4) !important;
    }

    button[class*="Button__secondary"]:not([class*="Button__disabled"]):not([disabled]) {
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%) !important;
        border-color: rgba(123, 104, 238, 0.3) !important;
        color: #cbd5e1 !important;
    }

    /* 7B. DISABLED & UNAVAILABLE BUTTONS - Explicit styling to never look active */
    button[disabled],
    button[class*="Button__disabled"],
    button[class*="Button__unavailable"],
    button[class*="Button__restricted"],
    div[class*="Button__disabled"] {
        background: rgba(20, 20, 32, 0.6) !important;
        background-color: rgba(20, 20, 32, 0.6) !important;
        color: #4b5563 !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 4px !important;
        box-shadow: none !important;
        text-shadow: none !important;
        cursor: not-allowed !important;
        filter: grayscale(100%) !important;
        opacity: 0.45 !important;
        transform: none !important;
        pointer-events: none !important;
    }

    button[disabled]:hover,
    button[class*="Button__disabled"]:hover,
    button[class*="Button__unavailable"]:hover,
    button[class*="Button__restricted"]:hover {
        background: rgba(20, 20, 32, 0.6) !important;
        color: #4b5563 !important;
        border-color: rgba(255, 255, 255, 0.08) !important;
        box-shadow: none !important;
        filter: grayscale(100%) !important;
        transform: none !important;
    }

    /* 8. INVENTORY GRID ITEMS & MATERIAL ICONS */
    div[class*="StoreView__container"] {
        border: 1px solid rgba(123, 104, 238, 0.25) !important;
        border-radius: 6px !important;
        background: rgba(12, 12, 30, 0.7) !important;
    }

    div[class*="GridItemView__container"] {
        border: 1px solid rgba(123, 104, 238, 0.25) !important;
        border-radius: 6px !important;
        background: rgba(12, 12, 30, 0.7) !important;
        transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease !important;
    }

    div[class*="GridItemView__container"]:hover {
        border-color: #7b68ee !important;
        background: rgba(123, 104, 238, 0.2) !important;
        box-shadow: 0 4px 12px rgba(123, 104, 238, 0.25) !important;
    }

    div[class*="GridItemView__selected"] {
        background-color: rgba(123, 104, 238, 0.35) !important;
        border: 1px solid #a78bfa !important;
        box-shadow: 0 0 10px rgba(167, 139, 250, 0.5) !important;
    }

    div[class*="MaterialIcon__indicatorContainer"] {
        border-radius: 3px !important;
    }

    /* 9. SCROLLBARS */
    ::-webkit-scrollbar {
        width: 6px !important;
        height: 6px !important;
    }
    ::-webkit-scrollbar-track {
        background: #030309 !important;
    }
    ::-webkit-scrollbar-thumb {
        background: rgba(123, 104, 238, 0.4) !important;
        border-radius: 3px !important;
    }
    ::-webkit-scrollbar-thumb:hover {
        background: #7b68ee !important;
    }
`;
