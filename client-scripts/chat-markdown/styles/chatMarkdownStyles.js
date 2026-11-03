/**
 * Styles for the formatted content inside chat bubbles - the elements
 * markdownRenderer.js produces.
 *
 * The host form loads ExtJS, whose stylesheet resets many inline and list
 * elements (weight, font-style, list markers, margins). Each rule here restates
 * what that reset would otherwise flatten, scoped to .wp-chat-bubble.
 */
export const CHAT_MARKDOWN_STYLES = `
        .wp-chat-bubble a {
            color: var(--wp-welcome-accent);
            text-decoration: underline;
        }

        /* The same ExtJS reset that flattens list markers also lists strong among
           the elements it forces back to normal weight, so a heading rendered from
           **bold** arrives unstyled unless the weight is restated here. Matches
           .wp-welcome-heading, which sets its weight explicitly for that reason.
           The reset clears font-style on em too, so italics are restated the same way. */
        .wp-chat-bubble strong,
        .wp-chat-bubble b {
            font-weight: 700;
        }

        .wp-chat-bubble em,
        .wp-chat-bubble i {
            font-style: italic;
        }

        .wp-chat-bubble del {
            text-decoration: line-through;
        }

        /* Field names and values the model quotes in backticks. */
        .wp-chat-bubble code {
            font-family: Consolas, Menlo, monospace;
            font-size: 0.92em;
            padding: 1px 4px;
            border-radius: 3px;
            background: rgba(0, 0, 0, 0.06);
        }

        /* Fenced blocks wrap instead of scrolling - the bubble is narrow, and a
           sideways scrollbar inside a chat reply is easy to miss. */
        .wp-chat-bubble pre {
            margin: 4px 0 0;
            padding: 6px 8px;
            border-radius: 4px;
            background: rgba(0, 0, 0, 0.06);
            white-space: pre-wrap;
            word-break: break-word;
        }

        .wp-chat-bubble pre code {
            padding: 0;
            background: none;
        }

        /* Replies quote example text the user could enter ("> Irrigation of ...").
           Restated in full because the host reset flattens blockquote margins. */
        .wp-chat-bubble blockquote {
            margin: 4px 0 0;
            padding: 2px 0 2px 10px;
            border-left: 3px solid var(--wp-welcome-accent);
            font-style: italic;
        }

        /* One section of a reply - a heading with its paragraphs or list. Sections
           are the bubble's flex children, so the gap above separates them while
           lines within one stay tight, mirroring .wp-welcome-section. */
        .wp-chat-block p {
            margin: 0;
        }

        /* Section title - spaced from its body like .wp-welcome-heading. */
        .wp-chat-block p.wp-chat-heading {
            margin-bottom: 8px;
        }

        /* The <ul> draws the bullet glyphs; no bullet characters live in the text.
           The host form loads ExtJS, whose stylesheet carries a bare element-level
           reset setting list-style to none on every li. Inheriting the marker from
           the ul is not enough to beat a rule that targets li directly, so both the
           list and the item restate it - these selectors outrank a bare element
           selector. display: list-item guards against a host reset that would
           otherwise flatten items to blocks. */
        .wp-chat-bubble ul {
            margin: 8px 0 0;
            padding-left: 20px;
            list-style: disc outside;
        }

        /* The heading already supplies the 8px; don't double it. */
        .wp-chat-block .wp-chat-heading + ul,
        .wp-chat-block .wp-chat-heading + ol {
            margin-top: 0;
        }

        .wp-chat-bubble li {
            margin: 0;
            display: list-item;
            list-style: disc outside;
        }

        /* Numbered replies - same reset, restated as decimal for both levels. */
        .wp-chat-bubble ol {
            margin: 8px 0 0;
            padding-left: 22px;
            list-style: decimal outside;
        }

        .wp-chat-bubble ol > li {
            list-style: decimal outside;
        }
`;
