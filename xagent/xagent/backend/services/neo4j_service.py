try:
    from neo4j import GraphDatabase
    NEO4J_AVAILABLE = True
except ImportError:
    NEO4J_AVAILABLE = False
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
        
        if NEO4J_AVAILABLE and all([self.uri, self.user, self.password]):
            try:
                self.driver = GraphDatabase.driver(
                    self.uri,
                    auth=(self.user, self.password)
                )
            except Exception as e:
                print(f"Failed to initialize Neo4j: {e}")
                self.driver = None
    
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
    Enhanced entity extraction with better NLP techniques
    """
    import re
    
    # Extract capitalized words (potential proper nouns)
    capitalized_words = re.findall(r'\b[A-Z][a-z]+\b', text)
    
    # Extract potential email addresses
    emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
    
    # Extract potential phone numbers
    phones = re.findall(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', text)
    
    # Extract potential URLs
    urls = re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', text)
    
    # Extract potential company/product names (words with capital letters)
    company_names = re.findall(r'\b[A-Z][a-z]*\s+[A-Z][a-z]*\b', text)
    
    # Combine all entities
    entities = capitalized_words + emails + phones + urls + company_names
    
    # Remove duplicates and filter out common words
    common_words = {'The', 'This', 'That', 'These', 'Those', 'And', 'Or', 'But', 'For', 'With', 'By'}
    entities = list(set([entity for entity in entities if entity not in common_words and len(entity) > 2]))
    
    return entities