import asyncio
import unittest
from typing import Any

from utils.threadmanagement.chat_state import ChatMessage, ChatState
from utils.threadmanagement.chat_state_redis_manager import ChatStateRedisManager
from utils.threadmanagement.redisdbutils import redisdbutils


class FakeRedisService:
    def __init__(self):
        self.store: dict[str, dict[str, Any]] = {}

    async def load_thread(self, thread_id: str):
        return self.store.get(thread_id)

    async def save_thread(self, thread_id: str, thread_state: dict[str, Any]):
        self.store[thread_id] = thread_state


class ChatStateRedisManagerTests(unittest.TestCase):
    def test_get_chat_state_returns_none_when_session_is_missing(self):
        manager = ChatStateRedisManager(FakeRedisService())

        chat_state = asyncio.run(manager.get_chat_state("missing-session"))

        self.assertIsNone(chat_state)

    def test_get_chat_state_rejects_blank_session_id(self):
        manager = ChatStateRedisManager(FakeRedisService())

        with self.assertRaisesRegex(ValueError, "session_id is required"):
            asyncio.run(manager.get_chat_state(""))

    def test_get_chat_state_rejects_payload_session_id_mismatch(self):
        redis_service = FakeRedisService()
        redis_service.store["chatstate:session-1"] = {
            "session_id": "other-session",
            "messages": [],
        }
        manager = ChatStateRedisManager(redis_service)

        with self.assertRaisesRegex(ValueError, "does not match Redis key"):
            asyncio.run(manager.get_chat_state("session-1"))

    def test_save_and_get_chat_state_round_trip(self):
        redis_service = FakeRedisService()
        manager = ChatStateRedisManager(redis_service)
        chat_state = ChatState(
            session_id="session-1",
            messages=[
                ChatMessage(role="user", text="hello"),
                ChatMessage(role="assistant", text="Hi there."),
            ],
        )

        asyncio.run(manager.save_chat_state(chat_state))
        loaded = asyncio.run(manager.get_chat_state("session-1"))

        self.assertEqual(loaded, chat_state)
        self.assertEqual(
            redis_service.store["chatstate:session-1"],
            {
                "session_id": "session-1",
                "messages": [
                    {"role": "user", "text": "hello"},
                    {"role": "assistant", "text": "Hi there."},
                ],
            },
        )

    def test_append_chat_turn_creates_state_and_appends_messages(self):
        redis_service = FakeRedisService()
        manager = ChatStateRedisManager(redis_service)

        asyncio.run(manager.append_chat_turn("session-1", "hello", "Hi there."))
        asyncio.run(manager.append_chat_turn("session-1", "next", "Second response."))

        self.assertEqual(
            redis_service.store["chatstate:session-1"],
            {
                "session_id": "session-1",
                "messages": [
                    {"role": "user", "text": "hello"},
                    {"role": "assistant", "text": "Hi there."},
                    {"role": "user", "text": "next"},
                    {"role": "assistant", "text": "Second response."},
                ],
            },
        )


class RedisDbUtilsValidationTests(unittest.TestCase):
    def test_get_thread_state_as_dict_rejects_blank_session_id(self):
        db_utils = redisdbutils()

        with self.assertRaisesRegex(ValueError, "session_id is required"):
            asyncio.run(db_utils.get_thread_state_as_dict(""))

    def test_get_history_turns_rejects_blank_session_id(self):
        db_utils = redisdbutils()

        with self.assertRaisesRegex(ValueError, "session_id is required"):
            asyncio.run(db_utils.get_history_turns(""))

    def test_append_chat_turn_rejects_blank_session_id(self):
        db_utils = redisdbutils()

        with self.assertRaisesRegex(ValueError, "session_id is required"):
            asyncio.run(db_utils.append_chat_turn("", "hello", "Hi there."))


if __name__ == "__main__":
    unittest.main()
