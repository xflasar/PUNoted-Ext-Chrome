const APEX_THEME_CONTROLS_CONTROLS = `
    /* 4B. CHAT CHANNELS & MESSAGES OVERHAUL */
    div[class*="Channel__container"],
    div[class*="Channel__wrapper"] {
        background: rgba(5, 5, 15, 0.95) !important;
    }

    div[class*="Channel__controls"] {
        background: rgba(12, 12, 32, 0.9) !important;
        border-bottom: 1px solid rgba(123, 104, 238, 0.25) !important;
    }

    div[class*="Message__message"] {
        background: rgba(14, 14, 36, 0.6) !important;
        border: 1px solid rgba(123, 104, 238, 0.18) !important;
        border-left: 3px solid rgba(123, 104, 238, 0.5) !important;
        border-radius: 6px !important;
        transition: all 0.15s ease !important;
    }

    div[class*="Message__message"]:hover {
        background: rgba(123, 104, 238, 0.12) !important;
        border-left-color: #a78bfa !important;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5) !important;
    }

    div[class*="Message__date"],
    div[class*="Message__time"] {
        color: #64748b !important;
        font-size: 11px !important;
    }

    div[class*="Sender__name"] {
        color: #a78bfa !important;
        font-weight: 600 !important;
    }

    span[class*="Sender__supporter"],
    div[class*="Sender__supporter"] {
        color: #d8b4fe !important;
        text-shadow: 0 0 6px rgba(216, 180, 254, 0.4) !important;
    }

    div[class*="Message__text"] {
        color: #f1f5f9 !important;
    }

    div[class*="Channel__prompt"],
    div[class*="Prompt__prompt"] {
        background: rgba(8, 8, 22, 0.95) !important;
        border-top: 1px solid rgba(123, 104, 238, 0.3) !important;
    }

    /* 4C. RADIO TOGGLES & SELECT BUTTONS */
    div[class*="SelectButton__container"],
    span[class*="RadioItem__container"],
    div[class*="RadioItem__container"] {
        background: rgba(14, 14, 34, 0.8) !important;
        border: 1px solid rgba(123, 104, 238, 0.25) !important;
        border-radius: 4px !important;
        transition: all 0.15s ease !important;
    }

    div[class*="RadioItem__indicator"] {
        background: rgba(100, 116, 139, 0.5) !important;
        border-radius: 2px !important;
    }

    div[class*="RadioItem__active"] {
        background: #7b68ee !important;
        box-shadow: 0 0 10px #7b68ee, 0 0 4px #a78bfa !important;
    }

    div[class*="RadioItem__value"] {
        color: #cbd5e1 !important;
        font-weight: 500 !important;
    }

    div[class*="InventorySortControls__criteria"],
    span[class*="InventorySortControls__criteria"] {
        background-color: #5a48cc !important;
        color: #ffffff !important;
        border: 1px solid #7B68EE !important;
        border-radius: 4px !important;
        transition: all 0.15s ease !important;
        &:hover {
            background-color: #2d2657ff !important;
        }
    }

    div[class*="ContextControls__item"] {
        background: rgba(14, 14, 34, 0.8) !important;
        border: 1px solid rgba(123, 104, 238, 0.25) !important;
        border-radius: 4px !important;
        transition: all 0.15s ease !important;
    }

    /* 4E. ALERT LIST ITEMS & NOTIFICATIONS */
    div[class*="AlertListItem__content"] {
        background: rgba(12, 12, 32, 0.75) !important;
        border: 1px solid rgba(123, 104, 238, 0.25) !important;
        border-left: 3px solid #7b68ee !important;
        border-radius: 6px !important;
        color: #e2e8f0 !important;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }

    div[class*="AlertListItem__container"]:hover,
    div[class*="AlertListItem__content"]:hover {
        background: rgba(22, 22, 54, 0.95) !important;
        border-color: #a78bfa !important;
        border-left-color: #c084fc !important;
        box-shadow: 0 0 12px rgba(167, 139, 250, 0.35), inset 0 0 8px rgba(123, 104, 238, 0.15) !important;
        color: #ffffff !important;
    }

    div[class*="AlertListItem__time"] {
        color: #94a3b8 !important;
    }

    div[class*="rp-nots-notification-type-label__label"] {
        font-weight: 700 !important;
        letter-spacing: 0.04em !important;
        border-radius: 3px !important;
    }
`;
