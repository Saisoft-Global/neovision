// Neo4j client with graceful fallback for missing dependencies
let neo4j: any = null;

try {
  neo4j = require('neo4j-driver');
} catch (error) {
  console.warn('Neo4j driver not available, using mock client');
}

export class Neo4jClient {
  private driver: any = null;
  private isAvailable: boolean = !!neo4j;

  constructor(uri: string = 'bolt://localhost:7687', username: string = 'neo4j', password: string = 'password') {
    if (this.isAvailable) {
      try {
        this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
      } catch (error) {
        console.error('Failed to initialize Neo4j driver:', error);
        this.isAvailable = false;
      }
    }
  }

  async run(query: string, params: any = {}) {
    if (!this.isAvailable) {
      console.warn('Neo4j not available, simulating query execution:', query);
      return { records: [] };
    }

    try {
      const session = this.driver.session();
      const result = await session.run(query, params);
      await session.close();
      return result;
    } catch (error) {
      console.error('Neo4j query failed:', error);
      throw error;
    }
  }

  async createNode(label: string, properties: any = {}) {
    const query = `CREATE (n:${label} $props) RETURN n`;
    const result = await this.run(query, { props: properties });
    return result.records[0]?.get('n');
  }

  async createRelationship(fromId: string, toId: string, relationshipType: string, properties: any = {}) {
    const query = `
      MATCH (a), (b) 
      WHERE ID(a) = $fromId AND ID(b) = $toId 
      CREATE (a)-[r:${relationshipType} $props]->(b) 
      RETURN r
    `;
    const result = await this.run(query, { fromId, toId, props: properties });
    return result.records[0]?.get('r');
  }

  async findNodes(label: string, properties: any = {}) {
    const whereClause = Object.keys(properties).length > 0 
      ? 'WHERE ' + Object.keys(properties).map(key => `n.${key} = $${key}`).join(' AND ')
      : '';
    
    const query = `MATCH (n:${label}) ${whereClause} RETURN n`;
    const result = await this.run(query, properties);
    return result.records.map(record => record.get('n'));
  }

  async close() {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
    }
  }

  isNeo4jAvailable(): boolean {
    return this.isAvailable;
  }

  async verifyConnectivity(): Promise<boolean> {
    if (!this.isAvailable || !this.driver) {
      return false;
    }

    try {
      const session = this.driver.session();
      await session.run('RETURN 1');
      await session.close();
      return true;
    } catch (error) {
      console.error('Neo4j connectivity check failed:', error);
      return false;
    }
  }
}

// Default client instance
export const neo4jClient = new Neo4jClient();