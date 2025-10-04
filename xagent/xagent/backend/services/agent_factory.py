from typing import Dict, Any, Optional
from app.schemas import AgentCreate, Agent
from services.agent_service import AgentService
from services.agents.email_agent import EmailAgent
from services.agents.meeting_agent import MeetingAgent
from .agents.knowledge_agent import KnowledgeAgent
from .agents.task_agent import TaskAgent
from .agents.enterprise.sap_agent import SAPAgent
from .agents.enterprise.salesforce_agent import SalesforceAgent
from .agents.enterprise.dynamics_agent import DynamicsAgent
from .agents.enterprise.oracle_agent import OracleAgent
from .agents.enterprise.workday_agent import WorkdayAgent

class AgentFactory:
    _instance = None
    _agent_types = {
        # Core agents
        'email': EmailAgent,
        'meeting': MeetingAgent,
        'knowledge': KnowledgeAgent,
        'task': TaskAgent,
        
        # Enterprise agents
        'sap': SAPAgent,
        'salesforce': SalesforceAgent,
        'dynamics': DynamicsAgent,
        'oracle': OracleAgent,
        'workday': WorkdayAgent
    }

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AgentFactory, cls).__new__(cls)
            cls._instance.agent_service = AgentService()
        return cls._instance

    async def create_agent(self, agent_type: str, config: Dict[str, Any]) -> Optional[Agent]:
        """Create a new agent of the specified type"""
        if agent_type not in self._agent_types:
            raise ValueError(f"Unsupported agent type: {agent_type}")

        # Create agent record
        agent_create = AgentCreate(
            name=config.get('name', f"{agent_type.capitalize()} Agent"),
            type=agent_type,
            description=config.get('description'),
            personality=config.get('personality'),
            skills=config.get('skills'),
            config=config
        )

        # Store in database
        agent = await self.agent_service.create_agent(agent_create)
        if not agent:
            return None

        # Initialize agent instance
        agent_class = self._agent_types[agent_type]
        agent_instance = agent_class(agent.id, config)
        
        return agent

    async def get_agent(self, agent_id: str) -> Optional[Agent]:
        """Get an existing agent by ID"""
        agent = await self.agent_service.get_agent(agent_id)
        if not agent:
            return None

        agent_class = self._agent_types.get(agent.type)
        if not agent_class:
            return None

        return agent_class(agent.id, agent.config)

    @classmethod
    def register_agent_type(cls, type_name: str, agent_class: Any) -> None:
        """Register a new agent type"""
        cls._agent_types[type_name] = agent_class