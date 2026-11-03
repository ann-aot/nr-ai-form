export const GUIDED_QUESTIONS_STYLES = `
        .wp-chat-guided-questions {
            display: none;
            width: 100%;
            max-width: 504px;
            height: auto;
            box-sizing: border-box;
            flex-direction: column;
            align-items: flex-end;
            gap: 8px;
            padding: 8px 16px;
            background: #FFFFFF;
            border-radius: 0;
            flex-shrink: 0;
            margin-top: auto;
        }

        .wp-chat-modal .wp-chat-guided-question {
            display: flex;
            max-width: 100%;
            min-height: 32px;
            height: auto;
            box-sizing: border-box;
            align-items: center;
            border: 1px solid #F2F2F2 !important;
            border-radius: 4px !important;
            background: #FFFFFF !important;
            color: #474D53 !important;
            font: 400 14px/24px 'BCSans', sans-serif !important;
            cursor: pointer;
            flex-shrink: 0;
            padding: 4px 8px !important;
            text-align: left;
            white-space: normal;
            overflow-wrap: anywhere;
            transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .wp-chat-modal.wp-chat-modal-expanded .wp-chat-guided-questions {
            max-width: none;
        }

        .wp-chat-modal .wp-chat-guided-question:hover,
        .wp-chat-modal .wp-chat-guided-question:focus-visible {
            background: #E6F0FA !important;
            border-color: #2F6690 !important;
            box-shadow: 0 0 0 2px rgba(47, 102, 144, 0.18);
            outline: none;
        }
`;
