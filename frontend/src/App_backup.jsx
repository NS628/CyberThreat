import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export default function App() {
  const svgRef = useRef(null);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState(null);

  // 1. Fetch data from FastAPI backend
  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/graph')
      .then((res) => res.json())
      .then((data) => setGraphData(data))
      .catch((err) => console.error('Error fetching graph data:', err));
  }, []);

  // 2. Render D3 Force-Directed Graph
  useEffect(() => {
    if (!graphData.nodes.length) return;

    const width = 900;
    const height = 600;

    // Clear previous SVG contents
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('background', '#0f172a')
      .style('border-radius', '8px');

    // Color scale for CTI Node Types
    const colorScale = {
  ThreatActor: '#ef4444',
  Malware: '#f59e0b',
  Technique: '#22c55e',
  Vulnerability: '#8b5cf6',
  Industry: '#3b82f6',
  Software: '#06b6d4',
};

    const simulation = d3
      .forceSimulation(graphData.nodes)
      .force(
        'link',
        d3
          .forceLink(graphData.links)
          .id((d) => d.id)
          .distance(120)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));

    // Draw Links
    const link = svg
      .append('g')
      .selectAll('line')
      .data(graphData.links)
      .enter()
      .append('line')
      .attr('stroke', '#475569')
      .attr('stroke-width', 2);

    // Draw Link Labels (Relationship Types)
    const linkText = svg
      .append('g')
      .selectAll('text')
      .data(graphData.links)
      .enter()
      .append('text')
      .text((d) => d.type)
      .attr('font-size', '10px')
      .attr('fill', '#94a3b8')
      .attr('text-anchor', 'middle');

    // Draw Nodes
    const node = svg
      .append('g')
      .selectAll('circle')
      .data(graphData.nodes)
      .enter()
      .append('circle')
      .attr('r', 18)
      .attr('fill', (d) => colorScale[d.type] || '#64748b')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('click', (event, d) => setSelectedNode(d))
      .call(
        d3
          .drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Draw Node Text Labels
    const nodeText = svg
      .append('g')
      .selectAll('text')
      .data(graphData.nodes)
      .enter()
      .append('text')
      .text((d) => d.label)
      .attr('font-size', '12px')
      .attr('fill', '#f8fafc')
      .attr('dx', 22)
      .attr('dy', 4);

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      linkText
        .attr('x', (d) => (d.source.x + d.target.x) / 2)
        .attr('y', (d) => (d.source.y + d.target.y) / 2);

      node.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
      nodeText.attr('x', (d) => d.x).attr('y', (d) => d.y);
    });
  }, [graphData]);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', color: '#1e293b' }}>
      <h1>Cyber Threat Intelligence Graph</h1>
      <div style={{ display: 'flex', gap: '20px' }}>
        <svg ref={svgRef}></svg>

        {/* Node Inspector Panel */}
        <div
          style={{
            flex: 1,
            padding: '16px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            background: '#f8fafc',
          }}
        >
          <h3>Node Details</h3>
          {selectedNode ? (
            <div>
              <p><strong>Label:</strong> {selectedNode.label}</p>
              <p><strong>Type:</strong> {selectedNode.type}</p>
              <h4>Properties:</h4>
              <pre style={{ background: '#e2e8f0', padding: '10px', borderRadius: '4px' }}>
                {JSON.stringify(selectedNode.details, null, 2)}
              </pre>
            </div>
          ) : (
            <p style={{ color: '#64748b' }}>Click any node in the graph to inspect its properties.</p>
          )}
        </div>
      </div>
    </div>
  );
}