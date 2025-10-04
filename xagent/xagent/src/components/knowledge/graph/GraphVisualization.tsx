import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { AlertCircle } from 'lucide-react';
import { neo4jClient } from '../../../services/neo4j/client';
import type { KnowledgeNode, KnowledgeRelation } from '../../../types/knowledge';

interface GraphData {
  nodes: KnowledgeNode[];
  links: KnowledgeRelation[];
}

export const GraphVisualization: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!neo4jClient) {
          setError('Neo4j is not configured. Graph visualization is disabled.');
          return;
        }

        const result = await neo4jClient.executeQuery(`
          MATCH (n)-[r]->(m)
          RETURN n, r, m
          LIMIT 100
        `);

        const nodes = new Map<string, KnowledgeNode>();
        const links: KnowledgeRelation[] = [];

        result.forEach(record => {
          const source = record.get('n').properties;
          const target = record.get('m').properties;
          const relation = record.get('r');

          nodes.set(source.id, source);
          nodes.set(target.id, target);

          links.push({
            id: relation.properties.id || crypto.randomUUID(),
            type: relation.type,
            sourceId: source.id,
            targetId: target.id,
            properties: relation.properties,
            confidence: relation.properties.confidence || 1,
          });
        });

        setData({
          nodes: Array.from(nodes.values()),
          links,
        });
      } catch (error) {
        setError('Failed to fetch graph data');
        console.error('Graph data error:', error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear existing visualization
    d3.select(svgRef.current).selectAll('*').remove();

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('viewBox', [0, 0, width, height])
      .call(d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        }));

    const g = svg.append('g');

    // Create forces
    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.links)
        .id((d: any) => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50));

    // Create links
    const links = g.append('g')
      .selectAll('line')
      .data(data.links)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.confidence || 1) * 2);

    // Create nodes
    const nodes = g.append('g')
      .selectAll('g')
      .data(data.nodes)
      .join('g')
      .call(d3.drag<SVGGElement, KnowledgeNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Add circles to nodes
    nodes.append('circle')
      .attr('r', 20)
      .attr('fill', d => getNodeColor(d.type))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add labels to nodes
    nodes.append('text')
      .text(d => d.label)
      .attr('x', 25)
      .attr('y', 5)
      .attr('font-size', '12px')
      .attr('fill', '#666');

    // Add titles for hover
    nodes.append('title')
      .text(d => `${d.label}\nType: ${d.type}`);

    // Update positions on simulation tick
    simulation.on('tick', () => {
      links
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodes
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [data]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 p-8">
        <div className="flex items-start space-x-3 text-amber-600 bg-amber-50 px-4 py-3 rounded-lg">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
    />
  );
};

function getNodeColor(type: string): string {
  const colors: Record<string, string> = {
    concept: '#60A5FA', // blue-400
    entity: '#34D399', // emerald-400
    document: '#F472B6', // pink-400
    fact: '#A78BFA', // violet-400
  };
  return colors[type] || '#9CA3AF'; // gray-400 as default
}