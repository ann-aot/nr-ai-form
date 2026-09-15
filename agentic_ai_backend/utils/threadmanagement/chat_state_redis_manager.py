import logging

from .chat_state import ChatMessage, ChatState
from utils.redisservice import RedisService

logger = logging.getLogger(__name__)


class ChatStateRedisManager:
    """Save and load ChatState records in Redis."""

    def __init__(self, redis_service: RedisService):
        self.redis_service = redis_service

    async def get_chat_state(self, session_id: str) -> ChatState | None:
        self._validate_session_id(session_id)
        logger.info("Loading ChatState from Redis session_id=%s", session_id)
        print(f"Loading ChatState {session_id} from Redis...")

        payload = await self.redis_service.load_thread(self._chat_state_key(session_id))
        if payload is None:
            logger.info("ChatState not found in Redis session_id=%s", session_id)
            print("ChatState not found in Redis.")
            return None

        chat_state = ChatState.model_validate(payload)
        if chat_state.session_id != session_id:
            logger.warning(
                "ChatState session_id mismatch redis_key=%s payload_session_id=%s",
                session_id,
                chat_state.session_id,
            )
            print(
                "ChatState session_id mismatch: "
                f"redis_key={session_id}, payload_session_id={chat_state.session_id}"
            )
            raise ValueError("ChatState session_id does not match Redis key.")

        logger.info(
            "ChatState found in Redis session_id=%s message_count=%s",
            session_id,
            len(chat_state.messages),
        )
        print("ChatState found in Redis.")
        return chat_state

    async def save_chat_state(self, chat_state: ChatState) -> None:
        self._validate_session_id(chat_state.session_id)
        logger.info(
            "Saving ChatState to Redis session_id=%s message_count=%s",
            chat_state.session_id,
            len(chat_state.messages),
        )
        print(f"Saving ChatState {chat_state.session_id} to Redis...")

        await self.redis_service.save_thread(
            self._chat_state_key(chat_state.session_id),
            chat_state.model_dump(mode="json"),
        )
        logger.info("ChatState saved to Redis session_id=%s", chat_state.session_id)
        print("ChatState saved to Redis.")

    async def append_chat_turn(self, session_id: str, user_text: str, assistant_text: str) -> ChatState:
        self._validate_session_id(session_id)
        chat_state = await self.get_chat_state(session_id)
        if chat_state is None:
            chat_state = ChatState(session_id=session_id)

        chat_state.messages.extend(
            [
                ChatMessage(role="user", text=user_text),
                ChatMessage(role="assistant", text=assistant_text),
            ]
        )
        await self.save_chat_state(chat_state)
        return chat_state

    @staticmethod
    def _validate_session_id(session_id: str) -> None:
        if not isinstance(session_id, str) or not session_id.strip():
            raise ValueError("session_id is required.")
        if session_id != session_id.strip():
            raise ValueError("session_id must not include leading or trailing whitespace.")

    @staticmethod
    def _chat_state_key(session_id: str) -> str:
        return f"chatstate:{session_id}"
