/**
 * Markdown-to-HTML rendering for chat bubbles.
 *
 * A deliberately small renderer covering what the agents actually write: headings,
 * bold/italic/strike, inline and fenced code, bullet and numbered lists, block
 * quotes and links. Everything is escaped before markup is added, so model output
 * can never inject HTML of its own. Pure string functions - no DOM access - so
 * output depends only on the message text, and a reload reproduces it exactly.
 */
function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Inline emphasis on already-escaped text. Order matters: each marker is
 * consumed before the shorter one that would otherwise match inside it
 * (*** before **, ** before *, __ before _).
 *
 * The underscore forms only open and close at a word edge, so snake_case
 * and file_names_like_this are left alone; the * forms skip a lone "* "
 * list marker and arithmetic like "5 * 3".
 */
function applyEmphasis(html) {
    return html
        .replace(/\*\*\*(?!\s)(.+?)(?<!\s)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^\w])__(?!\s)(.+?)(?<!\s)__(?!\w)/g, '$1<strong>$2</strong>')
        .replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)(?<!\s)\*(?![*\w])/g, '$1<em>$2</em>')
        .replace(/(^|[^\w])_(?!\s)([^_\n]+?)(?<!\s)_(?!\w)/g, '$1<em>$2</em>')
        .replace(/~~(?!\s)(.+?)(?<!\s)~~/g, '<del>$1</del>');
}

export function formatMessage(text) {
    // Replace any special aggregator placeholder with the FrontCounter BC link before rendering.
    const FRONTCOUNTER_PLACEHOLDER = '-FRONTCOUNTER-BC-';
    const FRONTCOUNTER_LINK = '[FrontCounter BC](https://www2.gov.bc.ca/gov/content/industry/natural-resource-use/natural-resource-permits#:~:text=gov.bc.ca-,Contact%20information,-FrontCounter%20BC)';
    const normalizedText = String(text).replaceAll(FRONTCOUNTER_PLACEHOLDER, FRONTCOUNTER_LINK);

    // Step 1: Extract `inline code` first so nothing inside it - asterisks,
    // underscores, link syntax - is treated as formatting.
    const codePlaceholders = [];
    let processed = normalizedText.replace(/`([^`\n]+)`/g, (_, code) => {
        const idx = codePlaceholders.length;
        codePlaceholders.push(`<code>${escapeHtml(code)}</code>`);
        return `\x00CODE${idx}\x00`;
    });

    // Step 2: Extract Markdown links [text](url) before escaping so URLs are preserved intact.
    // Replace them with placeholders to protect them from HTML escaping and plain-URL detection.
    // The URL may hold one level of balanced parentheses (".../Page_(BC)") but no
    // quotes or angle brackets, so it can never break out of the href. Link text
    // is model output, so it is escaped like any other text.
    const mdLinkPlaceholders = [];
    processed = processed.replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)(?:[^\s()"<>]|\([^\s()"<>]*\))+)\)/g, (_, linkText, url) => {
        const idx = mdLinkPlaceholders.length;
        // mailto: hands off to the mail app - a new tab would just be left blank.
        const target = url.startsWith('mailto:') ? '' : ' target="_blank" rel="noopener noreferrer"';
        mdLinkPlaceholders.push(`<a href="${escapeHtml(url)}"${target}>${applyEmphasis(escapeHtml(linkText))}</a>`);
        return `\x00MDLINK${idx}\x00`;
    });

    // Step 3: Extract plain URLs (http/https and www.) before escaping.
    const plainUrlPlaceholders = [];
    // Match http(s):// URLs and www. URLs not already inside a Markdown link
    processed = processed.replace(/(?<!\x00MDLINK\d*)(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/g, (url) => {
        const idx = plainUrlPlaceholders.length;
        const href = url.startsWith('http') ? url : `https://${url}`;
        plainUrlPlaceholders.push(`<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`);
        return `\x00PLAINURL${idx}\x00`;
    });

    // Step 4: HTML-escape the remaining text (safe - placeholders use \x00 which won't be escaped)
    let formatted = escapeHtml(processed);

    // Step 5: Apply remaining Markdown formatting
    formatted = applyEmphasis(formatted);
    formatted = formatted.replace(/\n/g, '<br>');
    formatted = formatted.replace(/^[\u2022\-]\s+(.+)/gm, '<li>$1</li>');

    // Step 6: Restore placeholders
    formatted = formatted.replace(/\x00MDLINK(\d+)\x00/g, (_, i) => mdLinkPlaceholders[Number(i)]);
    formatted = formatted.replace(/\x00PLAINURL(\d+)\x00/g, (_, i) => plainUrlPlaceholders[Number(i)]);
    formatted = formatted.replace(/\x00CODE(\d+)\x00/g, (_, i) => codePlaceholders[Number(i)]);

    if (formatted.includes('<li>')) {
        formatted = `<ul>${formatted}</ul>`;
    }
    return formatted;
}

/**
 * Block-level renderer for assistant replies.
 *
 * formatMessage() is inline-only for this purpose: it turns newlines into <br>
 * before its bullet regex runs, so the ^ anchor can only match the very first
 * line, and anything it does match wraps the whole message - headings included -
 * in one <ul>. Replies are commonly several headed sections each with a list, so
 * the structure has to be built here instead.
 *
 * Shape of the source text:
 *   - a blank line starts a new section (rendered tight inside, spaced between)
 *   - a line opening with "- " or "* " is a list item; consecutive items group
 *     into one <ul>, which is what draws the bullet markers
 *   - a line opening with "1. " or "1) " is a numbered item, grouped into an <ol>
 *   - a line opening with "#".."######" is a heading, rendered as a bold
 *     paragraph to match the "**Heading**" style replies already use
 *   - consecutive lines opening with ">" group into one <blockquote>
 *   - a ``` fenced block is kept verbatim in a <pre>, blank lines and all
 *   - every other line is a paragraph
 *
 * Inline formatting (escaping, **bold**, links) is delegated to formatMessage so
 * both renderers treat the text identically. Output is a pure function of the
 * message text and role, both of which are persisted, so a reload reproduces the
 * reply exactly.
 */
export function formatMessageBlocks(text) {
    // ``` fenced blocks are pulled out before the blank-line split, which would
    // otherwise cut a block containing an empty line in two. Each becomes a
    // placeholder line of its own, rendered verbatim (escaped, no formatting).
    const codeBlocks = [];
    const source = String(text).replace(/```[^\n]*\n([\s\S]*?)\n?```/g, (_, code) => {
        const idx = codeBlocks.length;
        codeBlocks.push(`<pre><code>${escapeHtml(code)}</code></pre>`);
        return `\n\n\x00CODEBLOCK${idx}\x00\n\n`;
    });

    return source
        .split(/\n\s*\n/)
        .map((section) => {
            let html = '';
            let listItems = [];
            // 'ul', or the number an <ol> starts at - models often put blank lines
            // between numbered steps, which splits them across sections, so each
            // <ol> keeps the model's own numbering instead of restarting at 1.
            let listType = 'ul';
            let quoteLines = [];

            function flushList() {
                if (listItems.length === 0) return;
                html += listType === 'ul'
                    ? `<ul>${listItems.join('')}</ul>`
                    : `<ol start="${listType}">${listItems.join('')}</ol>`;
                listItems = [];
            }

            function addListItem(type, content) {
                // Switching between bullets and numbers starts a new list.
                if (listItems.length && (type === 'ul') !== (listType === 'ul')) flushList();
                if (listItems.length === 0) listType = type;
                listItems.push(`<li>${formatMessage(content)}</li>`);
            }

            function flushQuote() {
                if (quoteLines.length === 0) return;
                html += `<blockquote>${quoteLines.join('')}</blockquote>`;
                quoteLines = [];
            }

            section.split('\n').forEach((line) => {
                const trimmed = line.trim();
                if (!trimmed) return;
                const codeBlock = trimmed.match(/^\x00CODEBLOCK(\d+)\x00$/);
                if (codeBlock) {
                    flushList();
                    flushQuote();
                    html += codeBlocks[Number(codeBlock[1])];
                    return;
                }
                // Checked on the raw line - formatMessage escapes ">" to "&gt;".
                const quoteLine = trimmed.match(/^>\s?(.*)$/);
                if (quoteLine) {
                    flushList();
                    if (quoteLine[1].trim()) quoteLines.push(`<p>${formatMessage(quoteLine[1].trim())}</p>`);
                    return;
                }
                flushQuote();
                const listItem = trimmed.match(/^[-*•]\s+(.*)$/);
                if (listItem) {
                    addListItem('ul', listItem[1]);
                    return;
                }
                const numberedItem = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
                if (numberedItem) {
                    addListItem(Number(numberedItem[1]), numberedItem[2]);
                    return;
                }
                // A paragraph closes any run of items above it.
                flushList();
                const heading = trimmed.match(/^#{1,6}\s+(.*)$/);
                if (heading) {
                    // Drop any ** the model already wrapped the heading in, then bold it.
                    const headingText = heading[1].replace(/^\*\*(.*)\*\*$/, '$1');
                    html += `<p class="wp-chat-heading"><strong>${formatMessage(headingText)}</strong></p>`;
                    return;
                }
                // A line that is bold from end to end is a "**Heading**" line - the
                // style canned answers and most replies use for section titles.
                const boldLine = trimmed.match(/^\*\*([^*]+)\*\*$/);
                if (boldLine) {
                    html += `<p class="wp-chat-heading"><strong>${formatMessage(boldLine[1])}</strong></p>`;
                    return;
                }
                html += `<p>${formatMessage(trimmed)}</p>`;
            });
            flushList();
            flushQuote();

            return html ? `<div class="wp-chat-block">${html}</div>` : '';
        })
        .join('');
}
