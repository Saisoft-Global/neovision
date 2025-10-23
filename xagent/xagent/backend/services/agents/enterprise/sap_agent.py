from typing import Dict, Any, Optional
from ..base_agent import BaseAgent
from app.schemas import AgentStatus

class SAPAgent(BaseAgent):
    async def process_task(self, task_type: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        await self.update_status(AgentStatus.BUSY)
        
        try:
            if task_type == "create_sales_order":
                return await self._create_sales_order(input_data)
            elif task_type == "check_inventory":
                return await self._check_inventory(input_data)
            elif task_type == "process_purchase_requisition":
                return await self._process_purchase_requisition(input_data)
            else:
                raise ValueError(f"Unsupported task type: {task_type}")
        finally:
            await self.update_status(AgentStatus.IDLE)

    async def handle_message(self, message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        message_handlers = {
            "sales_order_request": self._create_sales_order,
            "inventory_check": self._check_inventory,
            "purchase_requisition": self._process_purchase_requisition
        }
        
        handler = message_handlers.get(message["type"])
        if handler:
            return await handler(message["data"])
        return None

    def _get_required_skills(self, task_type: str) -> list[str]:
        skill_requirements = {
            "create_sales_order": ["sap_sd", "sales_order_processing"],
            "check_inventory": ["sap_mm", "inventory_management"],
            "process_purchase_requisition": ["sap_mm", "procurement"]
        }
        return skill_requirements.get(task_type, [])

    async def _create_sales_order(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        # Implement SAP sales order creation logic
        return {
            "order_id": "SO123456",
            "status": "created",
            "details": input_data
        }

    async def _check_inventory(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        # Implement SAP inventory check logic
        return {
            "material": input_data["material"],
            "quantity_available": 100,
            "warehouse": "WH01"
        }

    async def _process_purchase_requisition(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        # Implement purchase requisition processing
        return {
            "pr_number": "PR789012",
            "status": "approved",
            "details": input_data
        }