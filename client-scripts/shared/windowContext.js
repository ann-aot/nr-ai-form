/**
 * Telling the main form window apart from a Posse popup, and carrying the chat's
 * open/closed state across that boundary.
 *
 * The form opens child browser windows for sub-forms (Add Well, Add a Purpose, Add
 * Surface Water Source and friends) through PossePopup(), which is window.open under
 * a javascript: href. The assistant loads in those windows exactly as it does in the
 * main one, so it has to answer two questions for itself: am I a popup, and was the
 * user mid-conversation when this window opened?
 */

/**
 * Whether the chat was open, recorded on every toggle.
 *
 * sessionStorage, not localStorage: a popup inherits a *copy* of its opener's
 * sessionStorage at the moment it is created, which is precisely the snapshot this
 * needs - "was the chat open when the user clicked through". localStorage would be
 * shared live in both directions instead, so a popup closing its own chat would
 * rewrite what the main window thinks, and a second popup opened later would read
 * the first popup's state rather than the form's.
 *
 * The same inheritance is what already carries the thread ID into popups, so the
 * assistant is not taking on a new dependency here.
 */
export const CHAT_OPEN_STATE_KEY = 'nrAiForm_chatOpen';

/**
 * Whether the chat was open in this window the last time it said.
 *
 * Selecting a value in a Posse form posts the page back and rebuilds the widget from
 * scratch, so without this a chat the user had open closes itself several times while
 * they work through a step - which reads as the assistant quitting on them.
 *
 * A popup has no record of its own on its first load and reads its opener's, which is
 * the same answer either way: the chat was open where the user last was.
 */
export function wasChatOpenHere() {
    try {
        return sessionStorage.getItem(CHAT_OPEN_STATE_KEY) === '1';
    } catch {
        return false;
    }
}

/** Record the chat's open state, for this window's next load and for any popup. */
export function saveChatOpenState(isOpen) {
    try {
        sessionStorage.setItem(CHAT_OPEN_STATE_KEY, isOpen ? '1' : '0');
    } catch {
        // Storage blocked (private mode, cookie policy). A popup then falls back to
        // reading the opener's live DOM, and failing that shows the launcher callout,
        // which is the safe end of the behaviour either way.
    }
}

/**
 * True when this window was opened by another window of the same form.
 *
 * window.opener only. It is the one signal that cannot be true of the main form
 * window, and it survives navigation inside the popup.
 *
 * The tempting DOM fallback - no #progressbar and no span.title, the two things the
 * main window has and popups do not - is wrong on its own, because the main window
 * does not always have them either. The bot-check page has no progress bar, which is
 * exactly how getCurrentFormStepFromDom() recognises it, and there is no application
 * ID to put in a heading before an application exists. Treating those pages as
 * popups would open the chat on the main window and tell the user they could
 * continue a conversation they never left.
 *
 * So a severed opener means this feature stays quiet rather than guessing. That
 * should not happen: a popup opened with noopener would not inherit sessionStorage
 * either, and the thread ID that carries the conversation into the popup depends on
 * that inheritance - if one works, so does the other.
 */
export function isPopupWindow() {
    try {
        return Boolean(window.opener) && window.opener !== window;
    } catch {
        // Reading .opener threw, which only happens for a window we are not allowed
        // to reach - so there is an opener, and this is a popup.
        return true;
    }
}

/**
 * Whether the chat was open in the window that opened this one.
 *
 * Read live from the opener first: it is the true state at the moment the popup
 * asks, and both windows are pages of the same Posse application, so the DOM is
 * reachable. Everything about that read is allowed to fail - the opener may be gone,
 * closed, or mid-postback with no widget built yet - so it falls through to the
 * inherited snapshot rather than guessing.
 *
 * Returns false when neither source can answer. That is the deliberate choice: the
 * cost of a wrong false is a callout on the launcher the user can ignore, while a
 * wrong true pops a window open over a form the user is trying to fill in.
 */
export function wasParentChatOpen() {
    try {
        const opener = window.opener;
        if (opener && !opener.closed) {
            const openerModal = opener.document.getElementById('wp-chat-modal');
            if (openerModal) return openerModal.classList.contains('open');
        }
    } catch {
        // Opener unreachable or its document not accessible - fall through.
    }

    try {
        return sessionStorage.getItem(CHAT_OPEN_STATE_KEY) === '1';
    } catch {
        return false;
    }
}
