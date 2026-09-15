from dotenv import load_dotenv
from agent_framework import AgentSession
from utils.redisservice import RedisService
import logging
import os
import re
from .chat_state import ChatState
from .chat_state_redis_manager import ChatStateRedisManager
from .thread_manager_interface import IThreadManager

logger = logging.getLogger(__name__)

# Leading "stepN-Name:" prefix the orchestrator prepends to user queries.
_STEP_PREFIX_RE = re.compile(r"^step\d[\w-]*:\s*", re.IGNORECASE)


def _message_role_text(msg) -> tuple[str | None, str]:
    """Extract (role, text) from a MAF Message object or its serialized dict form."""
    if isinstance(msg, dict):
        role = msg.get("role")
        text = " ".join(
            c.get("text", "")
            for c in msg.get("contents", [])
            if isinstance(c, dict) and c.get("type") == "text"
        )
    else:
        role = getattr(msg, "role", None)
        text = getattr(msg, "text", "") or ""
    return role, text.strip()


def _extract_messages(state: dict) -> list:
    """Return the stored message list, tolerating history-provider namespacing.

    Messages may sit directly at ``state["messages"]`` or, more commonly, under a
    history provider's source_id (e.g. ``state["in_memory"]["messages"]``).
    """
    if isinstance(state.get("messages"), list):
        return state["messages"]
    for value in state.values():
        if isinstance(value, dict) and isinstance(value.get("messages"), list):
            return value["messages"]
    return []

load_dotenv()

class redisdbutils(IThreadManager):
    def __init__(self):
        host = os.getenv("REDIS_HOST", "localhost")
        port = int(os.getenv("REDIS_PORT", "6379"))
        password = os.getenv("REDIS_PASSWORD")
        ssl = os.getenv("REDIS_SSL", "False").lower() == "true"
        ttl_days = int(os.getenv("REDIS_TTL_DAYS", "14"))
        self.redis_service = RedisService(host=host, port=port, password=password, ssl=ssl, ttl=ttl_days*24*60*60)
        self.chat_state_manager = ChatStateRedisManager(self.redis_service)

    async def get_chat_state(self, session_id: str) -> ChatState | None:
        self._validate_session_id(session_id)
        return await self.chat_state_manager.get_chat_state(session_id)

    async def save_chat_state(self, chat_state: ChatState) -> None:
        self._validate_session_id(chat_state.session_id)
        await self.chat_state_manager.save_chat_state(chat_state)

    async def append_chat_turn(self, session_id: str, user_text: str, assistant_text: str) -> ChatState:
        self._validate_session_id(session_id)
        return await self.chat_state_manager.append_chat_turn(session_id, user_text, assistant_text)

    async def get_thread_state(self, thread_id: str, agent):
        self._validate_session_id(thread_id)
        session = None
        try:
            # Try to load existing session
            if thread_id:
                logger.info("Loading thread state from Redis session_id=%s", thread_id)
                print(f"Loading thread {thread_id} from Redis...")
                thread_state = await self.redis_service.load_thread(thread_id)
                if thread_state:
                    logger.info("Thread state found in Redis session_id=%s", thread_id)
                    print("Thread state found in Redis. Resuming conversation.")
                    session = AgentSession.from_dict(thread_state)
                else:
                    logger.info("Thread state not found in Redis session_id=%s", thread_id)
                    print("Thread state not found in Redis. Creating new thread.")
        
        except Exception as e:
            logger.warning("Error loading thread state from Redis session_id=%s: %s", thread_id, e)
            print(f"Error initializing Redis or loading thread: {e}")

        # Create new session if not loaded
        if session is None:
            logger.info("Creating new thread state session_id=%s", thread_id)
            print("Creating new thread.")
            session = agent.create_session(session_id=thread_id)
        
        return session

    async def get_thread_state_as_dict(self, thread_id: str):
        self._validate_session_id(thread_id)
        try:
            # Try to load existing thread
            if thread_id:
                logger.info("Loading thread state dict from Redis session_id=%s", thread_id)
                print(f"Loading thread {thread_id} from Redis...")
                thread_state = await self.redis_service.load_thread(thread_id)
                if thread_state:
                    logger.info("Thread state dict found in Redis session_id=%s", thread_id)
                    print("Thread state found in Redis.")
                    return thread_state
                else:
                    logger.info("Thread state dict not found in Redis session_id=%s", thread_id)
                    print("Thread state not found in Redis.")

        except Exception as e:
            logger.warning("Error loading thread state dict from Redis session_id=%s: %s", thread_id, e)
            print(f"Error initializing Redis or loading thread: {e}")

        return None

    async def get_history_turns(self, thread_id: str, *, limit: int = 10) -> list[dict]:
        """Return recent user/assistant turns for a thread as plain {role, text} dicts.

        Curated context for cross-agent passing (Option 1): only user/assistant turns,
        most-recent `limit`, tool/system messages dropped. Reads Redis directly and
        tolerates a missing/corrupt thread by returning [].
        """
        self._validate_session_id(thread_id)
        try:
            logger.info("Loading history turns from Redis session_id=%s limit=%s", thread_id, limit)
            thread_state = await self.redis_service.load_thread(thread_id)
        except Exception as e:
            logger.warning("Error loading history turns from Redis session_id=%s: %s", thread_id, e)
            print(f"Error loading history from Redis: {e}")
            return []
        if not thread_state:
            logger.info("No thread state found for history turns session_id=%s", thread_id)
            return []

        session = AgentSession.from_dict(thread_state)
        messages = _extract_messages(session.state or {})

        turns: list[dict] = []
        for msg in messages:
            role, text = _message_role_text(msg)
            if role not in ("user", "assistant") or not text:
                continue
            if role == "user":
                text = _STEP_PREFIX_RE.sub("", text).strip()
            turns.append({"role": role, "text": text})

        return turns[-limit:]
    
    async def save_thread_state(self, thread_id: str, thread):
        self._validate_session_id(thread_id)
        try:
            state = thread.to_dict()
            logger.info("Saving thread state to Redis session_id=%s", thread_id)
            await self.redis_service.save_thread(thread_id, state) #setting TTL at Service level
            logger.info("Thread state saved to Redis session_id=%s", thread_id)
        except Exception as e:
            logger.warning("Error saving thread state to Redis session_id=%s: %s", thread_id, e)
            print(f"Error saving thread state to Redis: {e}")

    @staticmethod
    def _validate_session_id(session_id: str) -> None:
        if not isinstance(session_id, str) or not session_id.strip():
            raise ValueError("session_id is required.")
        if session_id != session_id.strip():
            raise ValueError("session_id must not include leading or trailing whitespace.")

    @staticmethod
    def _no_answer_key(thread_id: str) -> str:
        return f"noanswer:{thread_id}"

    async def get_no_answer_count(self, thread_id: str) -> int:
        """Return how many consecutive turns this session has failed to produce a real answer."""
        if not thread_id:
            return 0
        return await self.redis_service.get_int(self._no_answer_key(thread_id))

    async def increment_no_answer_count(self, thread_id: str) -> int:
        """Increment and return the consecutive no-answer counter for this session."""
        if not thread_id:
            return 1
        new_count = await self.get_no_answer_count(thread_id) + 1
        await self.redis_service.set_int(self._no_answer_key(thread_id), new_count)
        return new_count

    async def reset_no_answer_count(self, thread_id: str) -> None:
        """Reset the consecutive no-answer counter once a real answer is produced."""
        if thread_id:
            await self.redis_service.set_int(self._no_answer_key(thread_id), 0)

    async def close(self):
        if self.redis_service:
            await self.redis_service.close()
