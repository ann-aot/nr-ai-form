/**
 * Styles for the floating launcher and its helper message.
 *
 * The wrapper is the fixed element, not the button. The message sits above the
 * button and outside it, since a div inside a <button> would join its accessible
 * name and swallow clicks, so both are children of one anchored box.
 */
export const LAUNCHER_STYLES = `
        /* 1. Anchor ------------------------------------------------------------- */
        .wp-chat-launcher {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 99998;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            font-family: var(--wp-welcome-font, 'BCSans', sans-serif);
            /* A positioning box, not a surface: the message inside it is out of flow
               and the button is the only thing meant to be pressed. The controls
               below take the pointer back individually. */
            pointer-events: none;
        }

        /* While the assistant is paused for a sub-form popup the button is disabled,
           and browsers disagree on whether a disabled control answers :hover. The
           wrapper becomes the hover target so popupBlock.js can show its explanation.
           Dragging is refused separately, in the launcher's isHandle. */
        .wp-chat-launcher-blocked {
            pointer-events: auto;
        }

        /* 2. Button -------------------------------------------------------------
           Width hugs the label: 12px of padding either side of "How can I help?" at
           16px bold comes to the design's 150px, and a fixed width would clip the
           label wherever BC Sans is unavailable. Height is 12 + 22 + 12 = 46px. */
        .wp-chat-button {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            padding: 12px;
            background: #FAF9F8;
            color: #013366;
            border: none;
            border-radius: 12px;
            font-family: inherit;
            font-size: 16px;
            font-weight: 700;
            line-height: 22px;
            white-space: nowrap;
            cursor: pointer;
            /* Opens the chat, and the only surface the widget is dragged by. */
            pointer-events: auto;
            box-shadow:
                0 3.2px 7.2px rgba(0, 0, 0, 0.13),
                0 0.6px 1.8px rgba(0, 0, 0, 0.10);
            transition: background 0.2s ease;
        }

        .wp-chat-button:hover {
            background: #EDEBE9;
        }

        /* The ring is drawn inside the button: on a near-white card an outward ring
           would read as a second border against the page. */
        .wp-chat-button:focus-visible {
            outline: 2px solid #013366;
            outline-offset: -4px;
            background: #EDEBE9;
        }

        /* 3. Helper message -----------------------------------------------------
           Out of flow, so the wrapper's box stays the button's and the button does
           not move when the message appears or goes. In flow, with the wrapper
           anchored by its bottom edge, a message hanging below the button (the
           flipped case in dragStyles.js) would lift the button while it showed -
           which under the pointer is a hover flicker loop, and after a drag leaves
           the button below where it was dropped.

           bottom: 100% puts it directly above the button; right: 0 lines their right
           edges up, so it extends leftward over the form. pointer-events: none keeps
           what it covers clickable, since it stays up until the user closes it. */
        .wp-chat-launcher-tooltip {
            position: absolute;
            bottom: 100%;
            right: 0;
            width: 251px;
            max-width: calc(100vw - 40px);
            margin-bottom: 8px;
            pointer-events: none;
            filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.15));
        }

        .wp-chat-launcher-tooltip[hidden] {
            display: none;
        }

        /* Show the message again on hover, and on keyboard focus so it is not
           pointer-only. This overrides the [hidden] attribute rather than clearing
           it: the attribute records that the message is finished with, and hover
           borrows it back only for as long as the pointer stays.

           Matched on the wrapper but reached through the button, since the wrapper
           takes no pointer events and :hover applies to the ancestors of whatever
           was hit. A borrowed message therefore cannot itself be hovered. It grows
           upward from the fixed bottom edge, so nothing below it shifts. */
        .wp-chat-launcher:hover .wp-chat-launcher-tooltip[hidden],
        .wp-chat-launcher:focus-within .wp-chat-launcher-tooltip[hidden] {
            display: block;
        }

        /* Withheld from the pointer that just closed the message. The dismiss button
           is inside the launcher, so the rule above would hand the message straight
           back in the same frame. Same specificity and placed after it, so it wins
           while the class is set; JS clears the class on pointerleave.

           Hover only. The click handler blurs the X, so :focus-within is already
           false by then, and guarding it would strand a keyboard user with no
           pointerleave to clear the class. */
        .wp-chat-launcher-dismissed:hover .wp-chat-launcher-tooltip[hidden] {
            display: none;
        }

        .wp-chat-launcher-tooltip-body {
            position: relative;
            /* Room on the right for the dismiss button, which is lifted out of the
               flow so it cannot push the message into a second line. */
            padding: 8px 36px 8px 12px;
            background: #FFFFFF;
            border-radius: 2px;
            color: #313132;
            font-family: inherit;
            font-size: 16px;
            font-weight: 400;
            line-height: 22px;
            text-align: left;
            box-sizing: border-box;
        }

        /* Dismiss ---------------------------------------------------------------
           The only part of the message that takes the pointer, so the rest of it
           cannot block the form underneath. */
        .wp-chat-launcher-tooltip-dismiss {
            position: absolute;
            top: 4px;
            right: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            padding: 0;
            background: none;
            border: none;
            border-radius: 50%;
            color: #6B655D;
            cursor: pointer;
            pointer-events: auto;
            transition: background 0.15s ease, color 0.15s ease;
        }

        .wp-chat-launcher-tooltip-dismiss:hover {
            background: rgba(45, 42, 38, 0.08);
            color: #2D2A26;
        }

        .wp-chat-launcher-tooltip-dismiss:focus-visible {
            outline: 2px solid #003366;
            outline-offset: 1px;
        }

        .wp-chat-launcher-tooltip-dismiss-icon {
            width: 14px;
            height: 14px;
            fill: currentColor;
        }

        /* A message borrowed back by hover is already closed, so it has nothing to
           dismiss. [hidden] is what tells it apart from the first showing: hover
           overrides the attribute rather than clearing it. Without the X the text
           takes back the room reserved for it. */
        .wp-chat-launcher-tooltip[hidden] .wp-chat-launcher-tooltip-dismiss {
            display: none;
        }

        .wp-chat-launcher-tooltip[hidden] .wp-chat-launcher-tooltip-body {
            padding-right: 12px;
        }
`;
