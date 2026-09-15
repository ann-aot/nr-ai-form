import asyncio
import unittest
from unittest.mock import patch

from api_backend_server import _get_flattened_history
from utils.threadmanagement.chat_state import ChatMessage, ChatState


class FakeRedisUtils:
    async def get_chat_state(self, session_id: str):
        return ChatState(
            session_id=session_id,
            messages=[
                ChatMessage(role="user", text="hello"),
                ChatMessage(role="assistant", text="Hi there."),
            ],
        )


class HistoryTests(unittest.TestCase):
    def test_get_flattened_history_returns_chat_state_messages(self):
        with patch("api_backend_server.get_redis_utils", return_value=FakeRedisUtils()):
            history = asyncio.run(_get_flattened_history("client:session-1"))

        self.assertEqual(
            history,
            [
                {"role": "user", "text": "hello"},
                {"role": "assistant", "text": "Hi there."},
            ],
        )


if __name__ == "__main__":
    unittest.main()
