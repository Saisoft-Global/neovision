from neo4j import GraphDatabase
from typing import Optional, List, Dict, Any
import os

class Neo4jService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Neo4jService, cls).__new__(cls)
            cls._instance.initialize()
        return cls._instance
    
    def initialize(self):
        """Initialize Neo4j connection"""
        self.uri = os.getenv("NEO4J_URI")
        self.user = os.getenv("NEO4J_USER")
        self.password = os.getenv("NEO4J_PASSWORD")
        self.driver = None
        
        if all([self.uri, self.user, self.password]):
            try:
                self.driver = GraphDatabase.driver(
                    self.uri,
                    auth=(self.user, self.password)
                )
            except Exception as e:
                print(f"Failed to initialize Neo4j: {e}")
    
    def is_available(self) -> bool:
        """Check if Neo4j is available"""
        return self.driver is not None
    
    async def extract_and_store_knowledge(self, document: Dict[str, Any]) -> None:
        """Extract and store knowledge graph from document"""
        if not self.is_available():
            return
        
        try:
            with self.driver.session() as session:
                # Create document node
                session.run(
                    """
                    CREATE (d:Document {
                        id: $id,
                        title: $title,
                        content: $content
                    })
                    """,
                    id=document["id"],
                    title=document["title"],
                    content=document["content"]
                )
                
                # Extract and create entity nodes
                # This is a simplified example - in production you'd use NLP
                # to extract entities and relationships
                session.run(
                    """
                    MATCH (d:Document {id: $id})
                    WITH d
                    UNWIND $entities as entity
                    MERGE (e:Entity {name: entity})
                    CREATE (d)-[:MENTIONS]->(e)
                    """,
                    id=document["id"],
                    entities=extract_entities(document["content"])
                )
        except Exception as e:
            print(f"Failed to store in Neo4j: {e}")
    
    async def search_knowledge(self, query: str) -> List[Dict[str, Any]]:
        """Search knowledge graph"""
        if not self.is_available():
            return []
        
        try:
            with self.driver.session() as session:
                result = session.run(
                    """
                    MATCH (d:Document)-[:MENTIONS]->(e:Entity)
                    WHERE d.content CONTAINS $query OR e.name CONTAINS $query
                    RETURN d, collect(e) as entities
                    LIMIT 5
                    """,
                    query=query
                )
                
                return [
                    {
                        "document": dict(record["d"]),
                        "entities": [dict(e) for e in record["entities"]]
                    }
                    for record in result
                ]
        except Exception as e:
            print(f"Failed to search Neo4j: {e}")
            return []

def extract_entities(text: str) -> List[str]:
    """
    Simple entity extraction - in production use proper NLP
    """
    # This is a placeholder implementation
    words = text.split()
    return list(set([
        word for word in words 
        if word[0].isupper() and len(word) > 3
    ]))