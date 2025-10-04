from typing import Dict, Any, Optional
from ..base_agent import BaseAgent
from ....app.schemas import AgentStatus

class DynamicsAgent(BaseAgent):
    async def process_task(self, task_type: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        await self.update_status(AgentStatus.BUSY)
        
        try:
            if task_type == "create_account":
                return await self._create_account(input_data)
            elif task_type == "process_order":
                return await self._process_order(input_data)
            elif task_type == "update_contact":
                return await self._update_contact(input_data)
            else:
                raise ValueError(f"Unsupported task type: {task_type}")
        finally:
            await self.update_status(AgentStatus.IDLE)

    async def handle_message(self, message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        message_handlers = {
            "new_account": self._create_account,
            "order_request": self._process_order,
            "contact_update": self._update_contact
        }
        
        handler = message_handlers.get(message["type"])
        if handler:
            return await handler(message["data"])
        return None

    def _get_required_skills(self, task_type: str) -> list[str]:
        skill_requirements = {
            "create_account": ["dynamics_crm", "account_management"],
            "process_order": ["dynamics_sales", "order_processing"],
            "update_contact": ["dynamics_crm", "contact_management"]
        }
        return skill_requirements.get(task_type, [])

    async def _create_account(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        # Implement Dynamics account creation
        return {
            "account_id": "ACC123456",
            "name": input_data.get("name"),
            "type": input_data.get("type"),
            "status": "Active"
        }

    async def _process_order(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        # Implement order processing logic
        return {
            "order_id": "ORD789012",
            "status": "Processed",
            "details": input_data
        }

    async def _update_contact(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        # Implement contact update logic
        return {
            "contact_id": input_data.get("contact_id"),
            "status": "Updated",
            "changes": input_data.get("changes")
        }