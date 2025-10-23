from typing import Dict, Any, Optional
from .base_agent import BaseAgent
from app.schemas import AgentStatus
from ..pinecone_service import PineconeService
from ..neo4j_service import Neo4jService

class KnowledgeAgent(BaseAgent):
    def __init__(self, agent_id: str, config: Dict[str, Any]):
        super().__init__(agent_id, config)
        self.pinecone_service = PineconeService()
        self.neo4j_service = Neo4jService()

    async def process_task(self, task_type: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        await self.update_status(AgentStatus.BUSY)
        
        try:
            if task_type == "search_knowledge":
                return await self._search_knowledge(input_data)
            elif task_type == "add_knowledge":
                return await self._add_knowledge(input_data)
            elif task_type == "analyze_content":
                return await self._analyze_content(input_data)
            else:
                raise ValueError(f"Unsupported task type: {task_type}")
        finally:
            await self.update_status(AgentStatus.IDLE)

    async def handle_message(self, message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if message["type"] == "knowledge_query":
            return await self._search_knowledge(message["data"])
        return None

    def _get_required_skills(self, task_type: str) -> list[str]:
        skill_requirements = {
            "search_knowledge": ["knowledge_retrieval", "semantic_search"],
            "add_knowledge": ["knowledge_processing", "data_validation"],
            "analyze_content": ["content_analysis", "entity_extraction"],
        }
        return skill_requirements.get(task_type, [])

    async def _search_knowledge(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        query = input_data["query"]
        results = []

        # Search vector store if available
        if self.pinecone_service.is_available():
            embeddings = await self.pinecone_service.generate_embeddings(query)
            vector_results = await self.pinecone_service.search(embeddings)
            results.extend(vector_results)

        # Search knowledge graph if available
        if self.neo4j_service.is_available():
            graph_results = await self.neo4j_service.search_knowledge(query)
            results.extend(graph_results)

        return {
            "results": results,
            "source_count": len(results)
        }

    async def _add_knowledge(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        content = input_data["content"]
        success = True
        errors = []

        # Store in vector database
        if self.pinecone_service.is_available():
            try:
                embeddings = await self.pinecone_service.generate_embeddings(content)
                await self.pinecone_service.store_embeddings(
                    document_id=input_data.get("id", str(hash(content))),
                    embeddings=embeddings,
                    metadata={"content": content}
                )
            except Exception as e:
                success = False
                errors.append(f"Vector store error: {str(e)}")

        # Store in knowledge graph
        if self.neo4j_service.is_available():
            try:
                await self.neo4j_service.extract_and_store_knowledge({
                    "id": input_data.get("id", str(hash(content))),
                    "content": content
                })
            except Exception as e:
                success = False
                errors.append(f"Knowledge graph error: {str(e)}")

        return {
            "success": success,
            "errors": errors
        }

    async def _analyze_content(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze content for entities, topics, and generate summary"""
        content = input_data["content"]
        
        # Extract entities using simple NLP
        entities = []
        words = content.split()
        capitalized_words = [word.strip('.,!?;:') for word in words if word[0].isupper() and len(word) > 3]
        entities = list(set(capitalized_words))
        
        # Generate simple summary (first 100 characters)
        summary = content[:100] + "..." if len(content) > 100 else content
        
        # Extract topics based on common keywords
        topics = []
        topic_keywords = {
            "technology": ["software", "system", "application", "database", "API"],
            "business": ["customer", "sales", "revenue", "market", "product"],
            "finance": ["budget", "cost", "expense", "revenue", "financial"],
            "hr": ["employee", "hiring", "training", "performance", "benefits"]
        }
        
        content_lower = content.lower()
        for topic, keywords in topic_keywords.items():
            if any(keyword in content_lower for keyword in keywords):
                topics.append(topic)
        
        return {
            "entities": entities,
            "summary": summary,
            "topics": topics,
            "word_count": len(words),
            "analysis_confidence": 0.8
        }