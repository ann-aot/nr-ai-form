/**
 * Styles for the paused state.
 *
 * The cover does the dimming rather than the parts underneath: one translucent sheet
 * reads as "this whole thing is waiting", where fading each part separately reads as
 * several things individually broken.
 */
export const POPUP_BLOCK_STYLES = `
        /* Fallback for browsers without inert. It stops the pointer but not the
           keyboard, which is why inert does the real work in popupBlock.js. */
        .wp-chat-modal-blocked > *:not(.wp-chat-blocked) {
            pointer-events: none;
        }

        .wp-chat-blocked {
            position: absolute;
            inset: 0;
            z-index: 5;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 24px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.82);
            text-align: center;
            font-family: var(--wp-welcome-font, 'BCSans', sans-serif);
            color: #313132;
            /* The cover is not a control and must not swallow anything meant for the
               page behind the modal. */
            pointer-events: none;
        }

        .wp-chat-blocked[hidden] {
            display: none;
        }

        .wp-chat-blocked-message {
            margin: 0;
            font-size: 14px;
            font-weight: 700;
            line-height: 20px;
        }

        .wp-chat-blocked-hint {
            margin: 0;
            font-size: 13px;
            font-weight: 400;
            line-height: 18px;
            color: #55504A;
        }

        /* The launcher keeps its shape and loses its lift: still recognisably the
           assistant, plainly not pressable. */
        .wp-chat-button:disabled {
            opacity: 0.55;
            cursor: not-allowed;
            box-shadow: none;
        }

        .wp-chat-button:disabled:hover {
            background: #FAF9F8;
        }
`;
