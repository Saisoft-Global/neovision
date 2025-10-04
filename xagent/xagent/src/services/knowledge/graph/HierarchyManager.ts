import { neo4jClient } from '../../neo4j/client';
import type { KnowledgeNode, KnowledgeRelation } from '../../../types/knowledge';

export class HierarchyManager {
  async createHierarchicalRelation(
    parentId: string,
    childId: string,
    type: string
  ): Promise<void> {
    if (!neo4jClient) return;

    await neo4jClient.executeQuery(`
      MATCH (parent:Entity {id: $parentId})
      MATCH (child:Entity {id: $childId})
      MERGE (parent)-[r:${type}]->(child)
      SET r.hierarchical = true
    `, { parentId, childId });
  }

  async getHierarchy(rootId: string): Promise<any> {
    if (!neo4jClient) return null;

    const result = await neo4jClient.executeQuery(`
      MATCH path = (root:Entity {id: $rootId})-[r:CONTAINS*]->(child:Entity)
      RETURN path
    `, { rootId });

    return this.processHierarchyResult(result);
  }

  private processHierarchyResult(result: any) {
    if (!result?.length) return null;

    const nodes = new Map<string, KnowledgeNode>();
    const relations = new Set<string>();
    const hierarchy: any = {};

    result.forEach((record: any) => {
      const path = record.get('path');
      path.segments.forEach((segment: any) => {
        // Add nodes
        const startNode = segment.start.properties;
        const endNode = segment.end.properties;
        nodes.set(startNode.id, startNode);
        nodes.set(endNode.id, endNode);

        // Add relations
        const relation = segment.relationship.properties;
        relations.add(JSON.stringify({
          from: startNode.id,
          to: endNode.id,
          type: segment.relationship.type,
          properties: relation
        }));

        // Build hierarchy
        if (!hierarchy[startNode.id]) {
          hierarchy[startNode.id] = {
            ...startNode,
            children: []
          };
        }
        if (!hierarchy[endNode.id]) {
          hierarchy[endNode.id] = {
            ...endNode,
            children: []
          };
        }
        hierarchy[startNode.id].children.push(hierarchy[endNode.id]);
      });
    });

    return {
      nodes: Array.from(nodes.values()),
      relations: Array.from(relations).map(r => JSON.parse(r)),
      hierarchy: hierarchy[result[0].get('path').start.properties.id]
    };
  }
}