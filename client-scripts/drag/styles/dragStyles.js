/**
 * Styles for dragging the assistant around the window.
 *
 * Two jobs: saying which surfaces are grab handles, and keeping a drag in progress
 * from being read by the browser as a text selection or a page scroll.
 */
export const DRAG_STYLES = `
        /* 1. Handles -----------------------------------------------------------
           touch-action: none is what stops a touch drag scrolling the page
           underneath instead of moving the panel. It is deliberately not on
           .wp-chat-modal, which would take the message list's own scrolling with
           it - only on the header, which has nothing to scroll. */
        .wp-chat-header {
            cursor: move;
            touch-action: none;
        }

        /* The header's own controls are still buttons. Stated here rather than left
           to inherit, because the rule above would otherwise hand them a move
           cursor and make them look like part of the handle. */
        .wp-chat-header .wp-chat-header-button {
            cursor: pointer;
        }

        /* While paused, the whole panel is the handle. Its children are inert and
           pointer-events: none by then, so a press lands on the modal itself - and
           the one thing still worth doing with a paused assistant is moving it off
           the form the user is trying to read underneath it. */
        .wp-chat-modal-blocked {
            cursor: move;
            touch-action: none;
        }

        /* The launcher is a button the user can also move, so it keeps the pointer
           cursor its own stylesheet gives it; only the touch behaviour changes. */
        .wp-chat-launcher {
            touch-action: none;
        }

        /* 2. Saying so ----------------------------------------------------------
           A move cursor is only found by someone already hovering the right strip,
           which is no use to a user looking for a way to uncover the form. The grip
           is the standard sign for "this moves", and it sits in the header because
           that is the part that moves it. */
        .wp-chat-drag-grip {
            width: 16px;
            height: 16px;
            flex-shrink: 0;
            fill: currentColor;
            /* Present, not loud. It shares the header's white, so full strength
               would read as another control competing with the title. */
            opacity: 0.55;
        }

        .wp-chat-header:hover .wp-chat-drag-grip {
            opacity: 0.9;
        }

        /* The launcher's own hint, under the message in its bubble. Quieter than the
           message above it - it answers a question the user has only once. */
        .wp-chat-launcher-tooltip-text,
        .wp-chat-launcher-tooltip-hint {
            display: block;
        }

        .wp-chat-launcher-tooltip-hint {
            margin-top: 4px;
            color: #55504A;
            font-size: 13px;
            line-height: 18px;
        }

        /* Withdrawn while paused, where it would be an instruction the user cannot
           follow: the launcher is disabled then, and a disabled button hands out no
           pointer events for a drag to start from. */
        .wp-chat-launcher-blocked .wp-chat-launcher-tooltip-hint {
            display: none;
        }

        /* 3. During a drag ------------------------------------------------------
           The pointer sweeps across the host page's form while dragging, and without
           this every field it crosses offers an I-beam and starts selecting text.
           The blanket !important is scoped to a class that exists only between
           pointerdown and pointerup. */
        body.wp-drag-active {
            cursor: move;
            user-select: none;
            -webkit-user-select: none;
        }

        body.wp-drag-active * {
            cursor: move !important;
            user-select: none !important;
            -webkit-user-select: none !important;
        }

        /* 4. Tooltip flip -------------------------------------------------------
           The message sits above the button, so once the launcher is dragged near the
           top of the window there is no room left for it. This hangs it below the
           button instead. Both orientations are absolute offsets against the wrapper,
           so neither takes space and the button does not move between them. */
        .wp-chat-launcher-flipped .wp-chat-launcher-tooltip {
            top: 100%;
            bottom: auto;
            margin-top: 8px;
            margin-bottom: 0;
        }

        /* The same for the other axis. The message hangs leftward from the button's
           right edge, and it is wider than the button, so near the left of the window
           it would run off. This lines its left edge up with the button's and lets it
           hang rightward instead. */
        .wp-chat-launcher-near-left .wp-chat-launcher-tooltip {
            right: auto;
            left: 0;
        }
`;
