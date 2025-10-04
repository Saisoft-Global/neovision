from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class AgentStatus(str, Enum):
    IDLE = "idle"
    ACTIVE = "active"
    BUSY = "busy"
    ERROR = "error"

class AgentPersonality(BaseModel):
    friendliness: float = Field(..., ge=0, le=1)
    formality: float = Field(..., ge=0, le=1)
    proactiveness: float = Field(..., ge=0, le=1)
    detail_orientation: float = Field(..., ge=0, le=1)

class AgentSkill(BaseModel):
    name: str
    level: int = Field(..., ge=1, le=5)
    config: Optional[Dict[str, Any]] = None

class AgentBase(BaseModel):
    name: str
    type: str
    description: Optional[str] = None
    personality: Optional[AgentPersonality] = None
    skills: Optional[List[AgentSkill]] = None
    config: Optional[Dict[str, Any]] = None

class AgentCreate(AgentBase):
    pass

class AgentUpdate(AgentBase):
    name: Optional[str] = None
    type: Optional[str] = None

class Agent(AgentBase):
    id: int
    status: AgentStatus
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TaskBase(BaseModel):
    agent_id: int
    type: str
    input: Dict[str, Any]

class TaskCreate(TaskBase):
    pass

class Task(TaskBase):
    id: int
    output: Optional[Dict[str, Any]] = None
    status: str
    error: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True