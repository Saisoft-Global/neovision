from typing import Dict, Any, Optional
from ..base_agent import BaseAgent
from ....app.schemas import AgentStatus

class OracleAgent(BaseAgent):
    async def process_task(self, task_type: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        await self.update_status(AgentStatus.BUSY)
        
        try:
            if task_type == "process_gl_entry":
                return await self._process_gl_entry(input_data)
            elif task_type == "run_financial_report":
                return await self._run_financial_report(input_data)
            elif task_type == "manage_payables":
                return await self._manage_payables(input_data)
            else:
                raise ValueError(f"Unsupported task type: {task_type}")
        finally:
            await self.update_status(AgentStatus.IDLE)

    async def handle_message(self, message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        message_handlers = {
            "gl_entry": self._process_gl_entry,
            "financial_report": self._run_financial_report,
            "payables_request": self._manage_payables
        }
        
        handler = message_handlers.get(message["type"])
        if handler:
            return await handler(message["data"])
        return None

    def _get_required_skills(self, task_type: str) -> list[str]:
        skill_requirements = {
            "process_gl_entry": ["oracle_gl", "accounting"],
            "run_financial_report": ["oracle_financials", "reporting"],
            "manage_payables": ["oracle_ap", "payables_management"]
        }
        return skill_requirements.get(task_type, [])

    async def _process_gl_entry(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        # Implement GL entry processing
        return {
            "entry_id": "GL123456",
            "status": "Posted",
            "details": input_data
        }

    async def _run_financial_report(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        # Implement financial report generation
        return {
            "report_id": "FIN789012",
            "type": input_data.get("report_type"),
            "data": {"sample": "financial data"}
        }

    async def _manage_payables(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        # Implement payables management
        return {
            "invoice_id": input_data.get("invoice_id"),
            "status": "Processed",
            "payment_details": {"sample": "payment data"}
        }