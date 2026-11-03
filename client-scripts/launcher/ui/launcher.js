/**
 * Floating launcher button and its helper message.
 *
 * The button is always present. The message appears once per session and stays on
 * screen until the user closes it with the X, opens the assistant, or moves to
 * another step of the form.
 */

/**
 * sessionStorage key holding the helper message's state.
 *
 * Values:
 *   'page:<step>' - shown on that step, not yet dismissed
 *   '1'           - finished with, by dismissal or by the user moving on
 *
 * sessionStorage rather than localStorage so the message returns on a new visit,
 * and rather than memory so it survives the form's full-page postbacks, which
 * rebuild this widget from scratch. The step in the value is what distinguishes a
 * postback on the same page from a move to the next one.
 */
export const LAUNCHER_TOOLTIP_SEEN_KEY = 'nrAiForm_launcherTooltipSeen';

const SHOWN_ON_PREFIX = 'page:';
const SEEN_VALUE = '1';

export const LAUNCHER_CONTENT = {
    /**
     * Reads as the question the user would ask rather than the name of the thing
     * that answers it. The product name is introduced inside the assistant, where
     * there is room to say what it is, so PRODUCT_NAME is not used here.
     */
    label: 'How can I help?',
    tooltip: 'Select the icon anytime for help with your application.',
    /**
     * Sits inside the bubble rather than on a native tooltip, so it cannot compete
     * with the bubble for the same hover. Second, so a user who reads only the first
     * line loses nothing.
     */
    dragHint: 'Drag to move it out of the way.',
    dismissLabel: 'Dismiss this message'
};

// Material close, shared with the popup banner's dismiss control.
const DISMISS_ICON = `<svg class="wp-chat-launcher-tooltip-dismiss-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function readState(seenKey) {
    try {
        return sessionStorage.getItem(seenKey);
    } catch {
        // Storage blocked (private mode, cookie policy). Reading as no state shows
        // the message, which is the safer failure.
        return null;
    }
}

function writeState(seenKey, value) {
    try {
        sessionStorage.setItem(seenKey, value);
    } catch {
        // Storage blocked. The message may simply show again on the next page.
    }
}

/**
 * Whether to show the message, given the step now on screen.
 *
 * @param {string} seenKey - storage key this message records itself under
 * @param {string} pageKey - identifier for the step of the form on screen
 */
function shouldShowTooltip(seenKey, pageKey) {
    const state = readState(seenKey);
    if (!state) return true;
    if (state === SEEN_VALUE) return false;

    // An unreadable step is not evidence that the user has moved to another one.
    // Step detection reads the form's own chrome and comes back empty on some pages.
    if (!pageKey) return true;

    // Same step: a postback rebuilt the widget, so the message carries on.
    if (state === `${SHOWN_ON_PREFIX}${pageKey}`) return true;

    // Stamped on a different step, and never dismissed there. The user moved on.
    writeState(seenKey, SEEN_VALUE);
    return false;
}

/** Record that the message is on screen, on this step, still awaiting an answer. */
function markTooltipShown(seenKey, pageKey) {
    writeState(seenKey, `${SHOWN_ON_PREFIX}${pageKey}`);
}

/** Record that the message is finished with, and should not return on its own. */
function markTooltipSeen(seenKey) {
    writeState(seenKey, SEEN_VALUE);
}

/**
 * Build the launcher markup.
 *
 * The message is rendered hidden and revealed by createLauncher() only when this
 * session has not finished with it, so a postback cannot flash it before the check
 * runs.
 */
export function buildLauncherHtml(content = LAUNCHER_CONTENT) {
    return `
        <div class="wp-chat-launcher" id="wp-chat-launcher">
            <div class="wp-chat-launcher-tooltip" id="wp-chat-launcher-tooltip" role="status" hidden>
                <div class="wp-chat-launcher-tooltip-body"><span class="wp-chat-launcher-tooltip-text">${escapeHtml(content.tooltip)}</span><span class="wp-chat-launcher-tooltip-hint">${escapeHtml(content.dragHint)}</span><button class="wp-chat-launcher-tooltip-dismiss" id="wp-chat-launcher-tooltip-dismiss" type="button" aria-label="${escapeHtml(content.dismissLabel)}" title="${escapeHtml(content.dismissLabel)}">${DISMISS_ICON}</button></div>
            </div>
            <button class="wp-chat-button" id="wp-chat-button" type="button"><span class="wp-chat-button-label">${escapeHtml(content.label)}</span></button>
        </div>`;
}

/**
 * Wire up the launcher and show the helper message when it is due.
 *
 * The message closes in three ways: the dismiss button, the caller calling
 * hideTooltip() when the assistant opens, and arriving on a step other than the one
 * it was shown on - which is decided from storage at build time rather than watched
 * for here.
 *
 * A `notice` shows a one-off message in place of the usual one, under its own
 * storage key. It is not queued behind the usual message: both occupy the same
 * spot, and a notice is true only right now.
 *
 * @param {object} options
 * @param {HTMLElement} options.root - element containing the launcher markup
 * @param {object} [options.content] - the content object the launcher was built from
 * @param {string} [options.pageKey] - identifier for the step of the form on screen
 * @param {{ text: string, seenKey: string }} [options.notice] - message to show in
 *   place of the usual one, under its own seen-key
 * @returns {{ hideTooltip: (options?: { suppressHover?: boolean }) => void, hideNotice: () => void, setMessage: (text: string|null) => void }}
 */
export function createLauncher({ root, content = LAUNCHER_CONTENT, pageKey = '', notice = null }) {
    const tooltip = root ? root.querySelector('#wp-chat-launcher-tooltip') : null;
    if (!tooltip) return { hideTooltip: () => {}, hideNotice: () => {}, setMessage: () => {} };

    // The message's own line, not the whole bubble: the drag hint is a sibling
    // inside it, and rewriting the bubble's text would take the hint with it.
    const tooltipBody = tooltip.querySelector('.wp-chat-launcher-tooltip-text');
    const dismissButton = tooltip.querySelector('#wp-chat-launcher-tooltip-dismiss');
    // The wrapper, because it is what :hover is matched against.
    const launcher = tooltip.closest('.wp-chat-launcher');
    const message = notice ? notice.text : content.tooltip;
    const seenKey = notice ? notice.seenKey : LAUNCHER_TOOLTIP_SEEN_KEY;
    const page = String(pageKey ?? '');
    if (notice && tooltipBody) tooltipBody.textContent = message;

    // Whether setMessage() is currently holding other text in the bubble.
    let overriding = false;

    /**
     * Withhold the hover re-show until the pointer has left the launcher.
     *
     * The dismiss button sits inside the launcher, so at the moment the bubble is
     * hidden the pointer is still on the element whose :hover brings it back.
     */
    function suppressHoverReshow() {
        if (launcher) launcher.classList.add('wp-chat-launcher-dismissed');
    }

    /**
     * Close the message for the rest of the session.
     *
     * The storage write is unconditional: a bubble borrowed back by hover is already
     * `hidden`, and closing it still has to record that it is finished with.
     *
     * @param {object} [options]
     * @param {boolean} [options.suppressHover] - withhold the hover re-show until the
     *   pointer leaves. Pass false when the launcher is about to be hidden anyway,
     *   since no pointerleave would arrive to clear the suppression.
     */
    function hideTooltip({ suppressHover = true } = {}) {
        markTooltipSeen(seenKey);
        if (suppressHover) suppressHoverReshow();
        tooltip.hidden = true;
    }

    /** Close the notice. */
    function hideNotice() {
        hideTooltip({ suppressHover: false });
    }

    /**
     * Replace the bubble's text for as long as some condition holds, then restore it.
     *
     * Only the wording changes. Whether the bubble is showing, and whether hover
     * brings it back, stays the launcher's business.
     *
     * @param {string|null} text - the message to show, or null to restore the usual one
     */
    function setMessage(text) {
        if (!tooltipBody) return;
        if (text) {
            tooltipBody.textContent = text;
            overriding = true;
        } else if (overriding) {
            // Restored from the value captured at build time, never read back off the
            // element, so one override cannot become what the next one restores.
            tooltipBody.textContent = message;
            overriding = false;
        }
    }

    // The only way the message closes while the user stays on this step, so it has to
    // work on both showings - the one due this session and the one borrowed by hover.
    if (dismissButton) {
        dismissButton.addEventListener('click', () => {
            // Blurred first: a focused child keeps :focus-within true on the wrapper,
            // which is the other half of the rule handing the bubble back.
            dismissButton.blur();
            hideTooltip();
        });
    }

    // Once the pointer that closed the message has left, hovering back is a fresh
    // request for it.
    if (launcher) {
        launcher.addEventListener('pointerleave', () => {
            launcher.classList.remove('wp-chat-launcher-dismissed');
        });
    }

    if (!shouldShowTooltip(seenKey, page)) {
        return { hideTooltip, hideNotice, setMessage };
    }

    tooltip.hidden = false;
    // Re-stamped on every build so the next one recognises a postback on this step.
    // Skipped when the step is unknown, so an unreadable page cannot overwrite a good
    // stamp with one nothing will match again.
    if (page) markTooltipShown(seenKey, page);

    return { hideTooltip, hideNotice, setMessage };
}
