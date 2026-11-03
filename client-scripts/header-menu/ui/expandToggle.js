/**
 * Chat window expand / contract toggle.
 *
 * Switches the modal between its default size and a wider one by putting a single
 * class on it - all the sizing lives in CSS, so there is no inline style to fight
 * with the host page and no measurement to keep in sync on resize.
 *
 * Which icon shows is also driven by that class rather than by swapping markup, so
 * the button can never disagree with the window it controls.
 *
 * The chosen size outlives the page it was chosen on, which is the only reason this
 * module touches storage at all - see the key below.
 */

/** Class the modal wears while expanded. Sizing for it lives in client.js. */
export const EXPANDED_MODAL_CLASS = 'wp-chat-modal-expanded';

/**
 * Where the chosen size is kept, per window.
 *
 * The class alone only lasts as long as the page does, and a Posse page is short
 * lived: selecting a value posts the form back and rebuilds the widget from scratch,
 * so a window the user had enlarged came back at its default size several times over
 * while they worked through a step. Every other thing the user chose about the chat -
 * open or closed, where it sits, what was said - already survives that, and size was
 * the one piece that did not.
 *
 * The scope is in the key rather than beside it because a popup inherits its opener's
 * sessionStorage as it is created. Sharing one key would open every sub-form window
 * expanded to `calc(100vh - 60px)` by 680px, which in a window the form opens at
 * around 700px wide is very nearly all of it - the assistant covering the form it was
 * opened to help with. The form window never writes the popup's key, so a popup
 * starts at its default size and keeps whatever the user then chooses there.
 */
const EXPANDED_STATE_KEY_PREFIX = 'nrAiForm_chatExpanded';

function expandedStateKey(scope) {
    return `${EXPANDED_STATE_KEY_PREFIX}_${scope}`;
}

function wasExpanded(scope) {
    try {
        return sessionStorage.getItem(expandedStateKey(scope)) === '1';
    } catch {
        // Storage blocked (private mode, cookie policy). The default size is the
        // milder failure: the user re-expands, rather than meeting a window that
        // fills the screen for reasons they cannot undo.
        return false;
    }
}

function saveExpanded(scope, expanded) {
    try {
        sessionStorage.setItem(expandedStateKey(scope), expanded ? '1' : '0');
    } catch {
        // Nothing to do - the size holds until the next postback, as it used to.
    }
}

// Material fullscreen / fullscreen_exit - corner arrows, matching the design frames.
// They share the header's 20px icon size and take their colour from the button, so
// the hover treatment applies to them exactly as it does to the menu and close icons.
const EXPAND_ICON = `<svg class="wp-chat-header-icon wp-chat-icon-expand" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`;
const CONTRACT_ICON = `<svg class="wp-chat-header-icon wp-chat-icon-contract" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>`;

/** Build the toggle markup for inlining into the header template. */
export function buildExpandToggleHtml() {
    return `
                    <button class="wp-chat-header-button wp-chat-expand-button" id="wp-chat-expand-button" type="button" aria-pressed="false" aria-label="Expand chat window" title="Expand chat window">${EXPAND_ICON}${CONTRACT_ICON}</button>`;
}

/**
 * Wire the toggle up.
 *
 * @param {object} options
 * @param {HTMLElement} options.root - element containing the toggle markup
 * @param {HTMLElement} options.modal - the `.wp-chat-modal` element to resize
 * @param {string} [options.scope] - which window's chosen size this is, so a popup
 *   does not open at a size picked for the form window behind it
 * @returns {{ isExpanded: () => boolean, collapse: () => void }}
 */
export function createExpandToggle({ root, modal, scope = 'form' }) {
    const button = root ? root.querySelector('#wp-chat-expand-button') : null;
    if (!button || !modal) {
        return { isExpanded: () => false, collapse: () => {} };
    }

    function isExpanded() {
        return modal.classList.contains(EXPANDED_MODAL_CLASS);
    }

    function sync() {
        const expanded = isExpanded();
        const label = expanded ? 'Contract chat window' : 'Expand chat window';
        button.setAttribute('aria-pressed', String(expanded));
        button.setAttribute('aria-label', label);
        button.setAttribute('title', label);
    }

    function collapse() {
        modal.classList.remove(EXPANDED_MODAL_CLASS);
        saveExpanded(scope, false);
        sync();
    }

    button.addEventListener('click', () => {
        modal.classList.toggle(EXPANDED_MODAL_CLASS);
        saveExpanded(scope, isExpanded());
        sync();
    });

    // Restored here rather than on open, because this runs while the modal is still
    // display: none - so a window the user had enlarged is never painted at its
    // default size first and caught resizing itself afterwards.
    if (wasExpanded(scope)) modal.classList.add(EXPANDED_MODAL_CLASS);

    sync();

    return { isExpanded, collapse };
}
