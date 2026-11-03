/**
 * Putting the assistant out of use while a sub-form popup is open.
 *
 * Posse blocks the form behind a popup, but the assistant floating on top of it is
 * not part of that form and stays live - so a user can click a guided question, open
 * the menu, or type a message about fields that are frozen underneath them. Worse,
 * the assistant can offer to fill in a form it cannot currently touch.
 *
 * Blocking is visible rather than silent. A control that looks normal and does
 * nothing reads as broken; one that is plainly out of use for a stated reason reads
 * as waiting.
 */
export const POPUP_BLOCK_CONTENT = {
    message: 'Paused while the pop-up window is open.',
    hint: 'Finish or close that window to carry on here.',
    // Native tooltip on the launcher, which has no room to say it any other way.
    launcherTitle: 'Paused while the pop-up window is open'
};

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

/** Build the cover that sits over the chat while a popup is open. */
export function buildPopupBlockHtml(content = POPUP_BLOCK_CONTENT) {
    return `
            <div class="wp-chat-blocked" id="wp-chat-blocked" role="status" hidden>
                <p class="wp-chat-blocked-message">${escapeHtml(content.message)}</p>
                <p class="wp-chat-blocked-hint">${escapeHtml(content.hint)}</p>
            </div>`;
}

/**
 * Wire the block up.
 *
 * @param {object} options
 * @param {HTMLElement} options.modal - the chat modal
 * @param {HTMLElement} options.launcher - the launcher wrapper
 * @param {HTMLButtonElement} options.button - the launcher button
 * @param {(text: string|null) => void} [options.setLauncherMessage] - the launcher's
 *   setMessage, so the reason can be said where the launcher already speaks
 * @param {object} [options.content]
 * @returns {{ setBlocked: (blocked: boolean) => void }}
 */
export function createPopupBlock({
    modal,
    launcher,
    button,
    setLauncherMessage = null,
    content = POPUP_BLOCK_CONTENT
}) {
    const overlay = modal ? modal.querySelector('#wp-chat-blocked') : null;

    /**
     * `inert` is what actually blocks: it takes clicks, keyboard focus and the
     * accessible tree in one attribute, so the input cannot be typed into and the
     * menu cannot be tabbed to. It goes on the modal's children rather than the modal
     * itself, so the cover explaining why stays readable to a screen reader.
     *
     * The stylesheet also sets pointer-events: none on those children, which covers a
     * browser too old for inert - not the whole job, but not nothing either.
     */
    function setBlocked(blocked) {
        if (modal) {
            Array.from(modal.children).forEach((child) => {
                if (child === overlay) return;
                child.toggleAttribute('inert', blocked);
            });
            modal.classList.toggle('wp-chat-modal-blocked', blocked);
        }

        if (overlay) overlay.hidden = !blocked;

        // The launcher is the other way in: with the chat closed, blocking the modal
        // would achieve nothing if the button could still open it.
        if (button) {
            button.disabled = blocked;
            if (blocked) button.title = content.launcherTitle;
            else button.removeAttribute('title');
        }
        if (launcher) launcher.classList.toggle('wp-chat-launcher-blocked', blocked);

        /**
         * The launcher's own message invites a click, and it goes on offering one
         * while the button is dead: it is revealed by hovering the wrapper, which
         * `disabled` has no say over. So the reason is put where that message was,
         * rather than left to the native tooltip above - which several browsers do
         * not show on a disabled control at all.
         */
        if (setLauncherMessage) setLauncherMessage(blocked ? content.launcherTitle : null);
    }

    return { setBlocked };
}
