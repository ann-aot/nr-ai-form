/**
 * The banner a popup shows to say the conversation carries over.
 *
 * Opening a sub-form (Add Well, Add a Purpose, Add Surface Water Source) replaces the
 * user's view with a new browser window, and the assistant in it starts collapsed
 * with no visible sign that it is the same conversation. The history is in fact
 * intact - the thread ID rides across in sessionStorage - so this is a banner about
 * something already true, not a feature that moves data.
 *
 * It also offers to enlarge the window, because the form opens these around 700px
 * wide and a 420px assistant beside a sub-form is a tight fit.
 */

/**
 * Set when the user dismisses the banner, so it stays gone.
 *
 * It records a decision rather than an appearance. Selecting a field in a Posse
 * sub-form posts the page back and rebuilds the widget from scratch, several times
 * over in a short form - showing the banner only on the first of those meant it
 * vanished a moment after the user arrived, for no reason they could see. It now
 * stays until they close it.
 *
 * sessionStorage is the right store twice over: a popup inherits its opener's copy at
 * creation, and the main form never shows this banner, so the key can only have been
 * written by this popup itself - which is what makes the dismissal survive the
 * popup's own postbacks without following the user into the next popup they open.
 */
export const POPUP_CALLOUT_DISMISSED_KEY = 'nrAiForm_popupCalloutDismissed';

export const POPUP_CALLOUT_CONTENT = {
    message: 'Continue your conversation here.',
    // About the conversation, not about the window, so it outlives the resize offer:
    // once the window has been expanded, the reassurance is still the reason the
    // banner is here at all.
    hint: 'Your chat history will stay with you.',
    action: 'Expand to see more of the form',
    // Added below the button when the browser declines to resize the window. Its own
    // line rather than a rewrite of the hint, which says nothing about size.
    actionFallback: 'Drag the edge of the form window to resize it.',
    dismissLabel: 'Dismiss this message'
};

/**
 * The same message, for the launcher when the chat is closed.
 *
 * Its own seen-key: the launcher notice and the banner are two showings of one
 * message, and a user who saw it on the launcher should still get it inside the chat
 * they went on to open - that is where the window is, and where the offer to enlarge
 * it can be a button. The launcher tooltip cannot carry that button: it is
 * pointer-events: none by design so it never blocks the form underneath.
 */
export const POPUP_LAUNCHER_NOTICE_SEEN_KEY = 'nrAiForm_popupLauncherNoticeSeen';

export const POPUP_LAUNCHER_NOTICE = {
    text: POPUP_CALLOUT_CONTENT.message,
    seenKey: POPUP_LAUNCHER_NOTICE_SEEN_KEY
};

/** How large to grow the popup, before clamping to what the screen actually has. */
const PREFERRED_WIDTH = 1100;
const PREFERRED_HEIGHT = 850;

const INFO_ICON = `<svg class="wp-popup-callout-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`;
const EXPAND_ICON = `<svg class="wp-popup-callout-action-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`;

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function wasCalloutDismissed() {
    try {
        return Boolean(sessionStorage.getItem(POPUP_CALLOUT_DISMISSED_KEY));
    } catch {
        // Storage blocked. Showing the banner again is the milder failure, so treat
        // "cannot tell" as "not dismissed".
        return false;
    }
}

function markCalloutDismissed() {
    try {
        sessionStorage.setItem(POPUP_CALLOUT_DISMISSED_KEY, '1');
    } catch {
        // Nothing to do - the banner may reappear after the next postback.
    }
}

/**
 * Work out how large the window can grow, and where it must sit to do so.
 *
 * The whole screen counts, not just the space to the right of and below the window:
 * Posse opens its sub-forms at different sizes and positions, and one opened near the
 * right or bottom edge had no room past its own corner - so the offer was withheld in
 * some popups and not others. A window that would overrun the screen edge is moved
 * back first, since resizeTo() keeps the top-left corner fixed.
 */
function getGrowthTarget() {
    const widthBefore = window.outerWidth;
    const heightBefore = window.outerHeight;

    const screenLeft = screen.availLeft || 0;
    const screenTop = screen.availTop || 0;
    const targetWidth = Math.max(widthBefore, Math.min(PREFERRED_WIDTH, screen.availWidth));
    const targetHeight = Math.max(heightBefore, Math.min(PREFERRED_HEIGHT, screen.availHeight));
    return {
        widthBefore,
        heightBefore,
        targetWidth,
        targetHeight,
        // Pull the corner back only as far as the new size needs, never past the
        // screen's own top-left.
        targetX: Math.max(screenLeft, Math.min(window.screenX, screenLeft + screen.availWidth - targetWidth)),
        targetY: Math.max(screenTop, Math.min(window.screenY, screenTop + screen.availHeight - targetHeight))
    };
}

/**
 * Whether growing the window would visibly do anything.
 *
 * A user who already expanded the window keeps meeting the banner after every
 * postback, and an offer that cannot change anything is worse than no offer.
 */
function canGrowWindow() {
    const { widthBefore, heightBefore, targetWidth, targetHeight } = getGrowthTarget();
    // A few pixels of headroom is not room; window chrome varies by platform.
    return targetWidth > widthBefore + 16 || targetHeight > heightBefore + 16;
}

/**
 * Grow the window, moving it first if it would otherwise run off the screen.
 *
 * Returns whether the window actually changed size: browsers are inconsistent about
 * honouring this and refuse silently, so the caller checks rather than assumes.
 */
function enlargeWindow() {
    const { widthBefore, heightBefore, targetWidth, targetHeight, targetX, targetY } = getGrowthTarget();

    try {
        if (targetX !== window.screenX || targetY !== window.screenY) {
            window.moveTo(targetX, targetY);
        }
        window.resizeTo(targetWidth, targetHeight);
    } catch {
        return false;
    }
    // A refused resize is silent, so compare rather than trust the call.
    return window.outerWidth > widthBefore || window.outerHeight > heightBefore;
}

/**
 * Build the banner markup.
 *
 * Rendered hidden: whether it belongs on screen depends on which window this is and
 * what the form window was doing, neither of which is known at markup time.
 */
export function buildPopupCalloutHtml(content = POPUP_CALLOUT_CONTENT) {
    return `
            <div class="wp-popup-callout" id="wp-popup-callout" role="status" hidden>${INFO_ICON}
                <div class="wp-popup-callout-body">
                    <p class="wp-popup-callout-message">${escapeHtml(content.message)}</p>
                    <p class="wp-popup-callout-hint" id="wp-popup-callout-hint">${escapeHtml(content.hint)}</p>
                    <button class="wp-popup-callout-action" id="wp-popup-callout-resize" type="button">${EXPAND_ICON}${escapeHtml(content.action)}</button>
                    <p class="wp-popup-callout-note" id="wp-popup-callout-note" hidden></p>
                </div>
                <button class="wp-popup-callout-dismiss" id="wp-popup-callout-dismiss" type="button" aria-label="${escapeHtml(content.dismissLabel)}" title="${escapeHtml(content.dismissLabel)}">
                    <svg class="wp-popup-callout-dismiss-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
            </div>`;
}

/**
 * Wire the banner up.
 *
 * @param {object} options
 * @param {HTMLElement} options.root - element containing the banner markup
 * @param {object} [options.content] - the content object the banner was built from
 * @returns {{ show: () => void, dismiss: () => void }}
 */
export function createPopupCallout({ root, content = POPUP_CALLOUT_CONTENT }) {
    const callout = root ? root.querySelector('#wp-popup-callout') : null;
    if (!callout) return { show: () => {}, dismiss: () => {} };

    const note = callout.querySelector('#wp-popup-callout-note');
    const resizeButton = callout.querySelector('#wp-popup-callout-resize');
    const dismissButton = callout.querySelector('#wp-popup-callout-dismiss');

    function dismiss() {
        callout.hidden = true;
        markCalloutDismissed();
    }

    /**
     * Show the banner unless the user has closed it in this window.
     *
     * Nothing is recorded here: the banner is meant to persist across the postbacks
     * a sub-form makes as the user works through it, and only their own dismissal
     * ends it.
     */
    function show() {
        if (wasCalloutDismissed()) return;
        // The offer to expand is withheld once the window has nowhere left to grow -
        // after a postback this is what stops a resized window being offered another
        // resize that would do nothing.
        if (resizeButton && !canGrowWindow()) resizeButton.hidden = true;
        callout.hidden = false;
    }

    if (resizeButton) {
        resizeButton.addEventListener('click', () => {
            // Either way the offer is spent: the window is as big as it is going to
            // get, or the browser has refused and clicking again will not change
            // that. The line above it stays in both cases - it is about the
            // conversation, which is still the point of the banner.
            const grew = enlargeWindow();
            resizeButton.hidden = true;
            if (!grew && note) {
                note.textContent = content.actionFallback;
                note.hidden = false;
            }
        });
    }

    if (dismissButton) {
        dismissButton.addEventListener('click', dismiss);
    }

    return { show, dismiss };
}
