from typing import Dict, Any, Optional
from abc import ABC, abstractmethod
from ...app.schemas import AgentStatus

class BaseAgent(ABC):
    def __init__(self, agent_id: str, config: Dict[str, Any]):
        self.id = agent_id
        self.config = config
        self.status = AgentStatus.IDLE

    @abstractmethod
    async def process_task(self, task_type: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a task assigned to the agent"""
        pass

    @abstractmethod
    async def handle_message(self, message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Handle incoming messages"""
        pass

    async def update_status(self, status: AgentStatus) -> None:
        """Update agent status"""
        self.status = status

    def get_capabilities(self) -> Dict[str, Any]:
        """Get agent capabilities"""
        return {
            "skills": self.config.get("skills", []),
            "personality": self.config.get("personality", {}),
        }

    async def validate_task(self, task_type: str, input_data: Dict[str, Any]) -> bool:
        """Validate if agent can handle the task"""
        capabilities = self.get_capabilities()
        required_skills = self._get_required_skills(task_type)
        
        return all(
            any(skill["name"] == req_skill for skill in capabilities["skills"])
            for req_skill in required_skills
        )

    def _get_required_skills(self, task_type: str) -> list[str]:
        """Get required skills for a task type"""
        # This should be implemented by each agent type
        return []