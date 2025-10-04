from typing import List, Optional, Dict, Any
from app.database import get_db
from app.schemas import AgentCreate, AgentUpdate
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

class AgentService:
    def __init__(self):
        self.db = next(get_db())
    
    async def get_agents(self) -> List[Dict[str, Any]]:
        """Get all agents"""
        try:
            result = self.db.execute(
                "SELECT * FROM agents ORDER BY created_at DESC"
            )
            return [dict(row) for row in result]
        except SQLAlchemyError as e:
            print(f"Database error: {e}")
            return []
    
    async def create_agent(self, agent: AgentCreate) -> Optional[Dict[str, Any]]:
        """Create a new agent"""
        try:
            result = self.db.execute(
                """
                INSERT INTO agents (name, type, description, config)
                VALUES (:name, :type, :description, :config)
                RETURNING *
                """,
                {
                    "name": agent.name,
                    "type": agent.type,
                    "description": agent.description,
                    "config": agent.config
                }
            )
            self.db.commit()
            return dict(result.first())
        except SQLAlchemyError as e:
            print(f"Database error: {e}")
            self.db.rollback()
            return None
    
    async def get_agent(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Get agent by ID"""
        try:
            result = self.db.execute(
                "SELECT * FROM agents WHERE id = :id",
                {"id": agent_id}
            )
            row = result.first()
            return dict(row) if row else None
        except SQLAlchemyError as e:
            print(f"Database error: {e}")
            return None
    
    async def update_agent(
        self,
        agent_id: str,
        agent_update: AgentUpdate
    ) -> Optional[Dict[str, Any]]:
        """Update an agent"""
        try:
            result = self.db.execute(
                """
                UPDATE agents
                SET name = :name,
                    description = :description,
                    config = :config,
                    updated_at = NOW()
                WHERE id = :id
                RETURNING *
                """,
                {
                    "id": agent_id,
                    "name": agent_update.name,
                    "description": agent_update.description,
                    "config": agent_update.config
                }
            )
            self.db.commit()
            row = result.first()
            return dict(row) if row else None
        except SQLAlchemyError as e:
            print(f"Database error: {e}")
            self.db.rollback()
            return None
    
    async def delete_agent(self, agent_id: str) -> bool:
        """Delete an agent"""
        try:
            result = self.db.execute(
                "DELETE FROM agents WHERE id = :id",
                {"id": agent_id}
            )
            self.db.commit()
            return result.rowcount > 0
        except SQLAlchemyError as e:
            print(f"Database error: {e}")
            self.db.rollback()
            return False