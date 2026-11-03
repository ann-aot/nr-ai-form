/**
 * Knowing, in one window, that a sub-form popup is open somewhere.
 *
 * Posse blocks the form behind a popup: the fields underneath stop responding until
 * the sub-form is finished or closed. The assistant sitting on top of that form does
 * not inherit the block, so its guided questions, menu and input stay clickable while
 * everything around them is dead - and a question asked there is asked against a form
 * the user cannot currently act on.
 *
 * A window cannot ask the browser "is a popup open?", so the popups say so
 * themselves: each one hands its window object to its opener, and the opener watches
 * those objects for `closed`. Watching the object rather than listening for a
 * farewell matters, because a Posse popup navigates constantly - selecting a value
 * posts it back - and every one of those reloads would look like a close.
 */

/** Where a window keeps the popups that have reported in. */
const REGISTRY_KEY = '__aifaOpenPopups';

/** How often to sweep for windows that have gone. */
const SWEEP_INTERVAL_MS = 400;

/**
 * How often a popup repeats itself to its opener.
 *
 * Registering once on load is not enough: the opener may reload afterwards and come
 * back with an empty registry, and it has no way of discovering a popup that is
 * already open. Repeating is how a popup gets found again, and costs a property
 * lookup.
 */
const REANNOUNCE_INTERVAL_MS = 2000;

/**
 * Tell the opener this window exists, and keep telling it.
 *
 * Silent in a window with no opener, so the main form window simply does nothing.
 */
export function announceToOpener() {
    function announce() {
        try {
            const opener = window.opener;
            if (!opener || opener.closed) return;
            const registry = opener[REGISTRY_KEY];
            // A Set, added to from this window's realm - fine same-origin, and the
            // opener only ever reads `closed` off what it is given.
            if (registry && typeof registry.add === 'function') registry.add(window);
        } catch {
            // Opener unreachable. Nothing to announce to, and nothing to do about it.
        }
    }

    announce();
    const timer = setInterval(announce, REANNOUNCE_INTERVAL_MS);
    return { stop: () => clearInterval(timer) };
}

/**
 * Watch for popups opened from this window.
 *
 * `onChange` is called only when the answer changes, with true once at least one
 * popup is open and false once the last one has gone, so a caller can treat it as an
 * event rather than a poll.
 *
 * Every window runs this, not just the main form: a sub-form can open a sub-form of
 * its own, and the middle window is then as blocked as the one below it.
 */
export function watchForOpenPopups(onChange) {
    const openPopups = new Set();
    window[REGISTRY_KEY] = openPopups;

    let lastReported = false;

    function sweep() {
        openPopups.forEach((popup) => {
            try {
                if (popup.closed) openPopups.delete(popup);
            } catch {
                // Unreachable window: gone for our purposes either way.
                openPopups.delete(popup);
            }
        });

        const anyOpen = openPopups.size > 0;
        if (anyOpen === lastReported) return;
        lastReported = anyOpen;
        onChange(anyOpen);
    }

    const timer = setInterval(sweep, SWEEP_INTERVAL_MS);

    return {
        stop: () => clearInterval(timer),
        isAnyPopupOpen: () => openPopups.size > 0
    };
}
