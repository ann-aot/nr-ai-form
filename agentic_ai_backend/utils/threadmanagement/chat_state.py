from pydantic import BaseModel, ConfigDict, Field


class ChatMessage(BaseModel):
    """One chat turn stored in Redis."""

    role: str
    text: str

    model_config = ConfigDict(extra="forbid")


class ChatState(BaseModel):
    """Redis payload for a persisted chat session."""

    session_id: str
    messages: list[ChatMessage] = Field(default_factory=list)

    model_config = ConfigDict(extra="forbid")
