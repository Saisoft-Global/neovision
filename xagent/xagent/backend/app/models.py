from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base
import enum

class AgentStatus(str, enum.Enum):
    IDLE = "idle"
    ACTIVE = "active"
    BUSY = "busy"
    ERROR = "error"

class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    type = Column(String, index=True)  # e.g., 'hr', 'finance', 'support'
    description = Column(String)
    personality = Column(JSON)  # Store personality traits
    skills = Column(JSON)  # Store agent skills/capabilities
    status = Column(Enum(AgentStatus), default=AgentStatus.IDLE)
    config = Column(JSON)  # Store agent-specific configuration
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class AgentTask(Base):
    __tablename__ = "agent_tasks"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"))
    type = Column(String)  # Task type (e.g., 'email', 'document', 'meeting')
    input = Column(JSON)  # Task input data
    output = Column(JSON, nullable=True)  # Task output/result
    status = Column(String)  # Task status (pending, running, completed, failed)
    error = Column(String, nullable=True)  # Error message if task failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    agent = relationship("Agent", back_populates="tasks")

Agent.tasks = relationship("AgentTask", back_populates="agent")