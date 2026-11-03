/**
 * Styles for the popup continuation banner.
 *
 * It sits between the header and the message list as a band across the full width of
 * the modal, so it reads as chrome belonging to the window rather than as something
 * the assistant said. The gold rule down its left edge is BC Gov's #FCBA19, the same
 * accent the province's own header and notice components use, which is what makes a
 * yellow box read as an official notice rather than as a warning about something
 * being wrong - nothing here is wrong, the banner is good news.
 */
export const POPUP_CALLOUT_STYLES = `
        .wp-popup-callout {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 12px 10px 14px 12px;
            background: #FEF9EC;
            border-left: 4px solid #FCBA19;
            border-bottom: 1px solid #F0E3C0;
            /* The list below scrolls; this must not, or the notice would scroll away
               from a user who has not read it yet. */
            flex: 0 0 auto;
            font-family: var(--wp-welcome-font, 'BCSans', sans-serif);
            color: #2D2A26;
            box-sizing: border-box;
            /* Shown well after the window has painted - on a popup the user did not
               open, in a window they are still getting their bearings in. Arriving
               rather than simply being there is what makes it noticed. */
            animation: wp-popup-callout-in 180ms ease-out both;
        }

        @keyframes wp-popup-callout-in {
            from {
                opacity: 0;
                transform: translateY(-6px);
            }
            to {
                opacity: 1;
                transform: none;
            }
        }

        /* Motion is decoration here, and the banner is equally readable without it. */
        @media (prefers-reduced-motion: reduce) {
            .wp-popup-callout {
                animation: none;
            }
        }

        .wp-popup-callout[hidden] {
            display: none;
        }

        /* Dark enough amber to clear 4.5:1 on the banner's own background, since the
           glyph carries the "this is a notice" signal for anyone skimming. */
        .wp-popup-callout-icon {
            flex: 0 0 auto;
            width: 18px;
            height: 18px;
            margin-top: 1px;
            fill: #9A6A00;
        }

        .wp-popup-callout-body {
            flex: 1 1 auto;
            min-width: 0;
        }

        .wp-popup-callout-message {
            margin: 0;
            font-size: 14px;
            font-weight: 700;
            line-height: 20px;
        }

        /* Lighter and smaller than the message: the reassurance is the point, the
           offer to resize is an aside, and equal weight would make the banner look
           like two announcements instead of one. */
        .wp-popup-callout-hint {
            margin: 3px 0 0;
            font-size: 13px;
            font-weight: 400;
            line-height: 18px;
            color: #55504A;
        }

        .wp-popup-callout-hint[hidden] {
            display: none;
        }

        /* The refusal line, in place of the button that is now gone. Same voice as
           the hint above it, indented to nothing - it is a consequence of the button,
           not a third thing to read. */
        .wp-popup-callout-note {
            margin: 8px 0 0;
            font-size: 13px;
            font-weight: 400;
            line-height: 18px;
            color: #55504A;
        }

        .wp-popup-callout-note[hidden] {
            display: none;
        }

        /* A quiet outlined button rather than a filled one: it sits a few pixels from
           Send, and a second solid button would read as part of the conversation
           controls. White ground lifts it off the amber so it still reads as
           pressable. */
        .wp-popup-callout-action {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-top: 9px;
            padding: 5px 10px;
            background: #FFFFFF;
            border: 1px solid #DCC9A0;
            border-radius: 4px;
            color: #00528D;
            font-family: inherit;
            font-size: 13px;
            font-weight: 700;
            line-height: 18px;
            cursor: pointer;
            transition: background 0.15s ease, border-color 0.15s ease;
        }

        .wp-popup-callout-action[hidden] {
            display: none;
        }

        .wp-popup-callout-action:hover {
            background: #F4F8FC;
            border-color: #00528D;
        }

        .wp-popup-callout-action:focus-visible {
            outline: 2px solid #003366;
            outline-offset: 2px;
        }

        .wp-popup-callout-action-icon {
            width: 13px;
            height: 13px;
            fill: currentColor;
        }

        /* Circular hit target, no border: a second bordered control next to the
           action button would compete with it for the eye. */
        .wp-popup-callout-dismiss {
            flex: 0 0 auto;
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
            transition: background 0.15s ease, color 0.15s ease;
        }

        .wp-popup-callout-dismiss:hover {
            background: rgba(45, 42, 38, 0.08);
            color: #2D2A26;
        }

        .wp-popup-callout-dismiss:focus-visible {
            outline: 2px solid #003366;
            outline-offset: 1px;
        }

        .wp-popup-callout-dismiss-icon {
            width: 16px;
            height: 16px;
            fill: currentColor;
        }
`;
