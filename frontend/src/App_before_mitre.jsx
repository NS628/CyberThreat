import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

/* =========================================================
   CYBERSECURITY COLOR PALETTE
   ========================================================= */

const colorScale = {
  ThreatActor: '#ff1744',
  Malware: '#ff6d00',
  Technique: '#00e676',
  Vulnerability: '#d500f9',
  Industry: '#2979ff',
  Software: '#00e5ff',
  Entity: '#90a4ae',
};

/* =========================================================
   MAIN APPLICATION
   ========================================================= */

export default function App() {
  const svgRef = useRef(null);

  const [graphData, setGraphData] = useState({
    nodes: [],
    links: [],
  });

  const [selectedNode, setSelectedNode] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  /* =======================================================
     FETCH GRAPH DATA
     ======================================================= */

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/graph')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch graph data');
        }

        return res.json();
      })
      .then((data) => {
        setGraphData(data);
      })
      .catch((err) => {
        console.error('Error fetching graph data:', err);
      });
  }, []);

  /* =======================================================
     FILTER NODES
     ======================================================= */

  const nodeTypes = [
    'All',
    ...new Set(graphData.nodes.map((node) => node.type)),
  ];

  const filteredNodes = graphData.nodes.filter((node) => {
    const label = String(node.label || '').toLowerCase();
    const search = searchTerm.toLowerCase();

    const matchesSearch = label.includes(search);

    const matchesType =
      filterType === 'All' || node.type === filterType;

    return matchesSearch && matchesType;
  });

  const filteredNodeIds = new Set(
    filteredNodes.map((node) => node.id)
  );

  const filteredLinks = graphData.links
    .filter((link) => {
      const sourceId =
        typeof link.source === 'object'
          ? link.source.id
          : link.source;

      const targetId =
        typeof link.target === 'object'
          ? link.target.id
          : link.target;

      return (
        filteredNodeIds.has(String(sourceId)) &&
        filteredNodeIds.has(String(targetId))
      );
    })
    .map((link) => ({
      source:
        typeof link.source === 'object'
          ? link.source.id
          : link.source,

      target:
        typeof link.target === 'object'
          ? link.target.id
          : link.target,

      type: link.type,
    }));

  /* =======================================================
     D3 GRAPH
     ======================================================= */

  useEffect(() => {
    if (!graphData.nodes.length) return;

    const width = 900;
    const height = 600;

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    /* Security-style background */

    svg
      .style('background', '#050b14')
      .style('border-radius', '14px')
      .style('border', '1px solid #16324a');

    /* Main zoom group */

    const graphGroup = svg.append('g');

    /* =====================================================
       ZOOM
       ===================================================== */

    svg.call(
      d3
        .zoom()
        .scaleExtent([0.4, 3])
        .on('zoom', (event) => {
          graphGroup.attr(
            'transform',
            event.transform
          );
        })
    );

    /* =====================================================
       CLONE NODES
       ===================================================== */

    const simulationNodes = filteredNodes.map(
      (node) => ({
        ...node,
      })
    );

    /* =====================================================
       FORCE SIMULATION
       ===================================================== */

    const simulation = d3
      .forceSimulation(simulationNodes)
      .force(
        'link',
        d3
          .forceLink(filteredLinks)
          .id((d) => d.id)
          .distance(145)
      )
      .force(
        'charge',
        d3.forceManyBody().strength(-450)
      )
      .force(
        'center',
        d3.forceCenter(
          width / 2,
          height / 2
        )
      )
      .force(
        'collision',
        d3.forceCollide().radius(48)
      );

    /* =====================================================
       RELATIONSHIP LINES
       ===================================================== */

    const link = graphGroup
      .append('g')
      .selectAll('line')
      .data(filteredLinks)
      .enter()
      .append('line')
      .attr('stroke', '#31506a')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.8);

    /* =====================================================
       RELATIONSHIP LABELS
       ===================================================== */

    const linkText = graphGroup
      .append('g')
      .selectAll('text')
      .data(filteredLinks)
      .enter()
      .append('text')
      .text((d) => d.type)
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('fill', '#6f91aa')
      .attr('text-anchor', 'middle')
      .style('pointer-events', 'none');

    /* =====================================================
       NODES
       ===================================================== */

    const node = graphGroup
      .append('g')
      .selectAll('circle')
      .data(simulationNodes)
      .enter()
      .append('circle')
      .attr('r', 21)
      .attr(
        'fill',
        (d) =>
          colorScale[d.type] ||
          colorScale.Entity
      )
      .attr('stroke', '#dff9ff')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .style(
        'filter',
        (d) =>
          `drop-shadow(0 0 7px ${
            colorScale[d.type] ||
            colorScale.Entity
          })`
      )
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
      });

    /* =====================================================
       NODE LABELS
       ===================================================== */

    const nodeText = graphGroup
      .append('g')
      .selectAll('text')
      .data(simulationNodes)
      .enter()
      .append('text')
      .text((d) => d.label)
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .attr('fill', '#d9f7ff')
      .attr('dx', 28)
      .attr('dy', 4)
      .style('pointer-events', 'none');

    /* =====================================================
       DRAGGING
       ===================================================== */

    node.call(
      d3
        .drag()
        .on('start', (event, d) => {
          if (!event.active) {
            simulation.alphaTarget(0.3).restart();
          }

          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) {
            simulation.alphaTarget(0);
          }

          d.fx = null;
          d.fy = null;
        })
    );

    /* =====================================================
       SIMULATION TICK
       ===================================================== */

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      linkText
        .attr(
          'x',
          (d) =>
            (d.source.x + d.target.x) / 2
        )
        .attr(
          'y',
          (d) =>
            (d.source.y + d.target.y) / 2
        );

      node
        .attr('cx', (d) => d.x)
        .attr('cy', (d) => d.y);

      nodeText
        .attr('x', (d) => d.x)
        .attr('y', (d) => d.y);
    });

    return () => {
      simulation.stop();
    };
  }, [
    graphData,
    searchTerm,
    filterType,
  ]);

  /* =======================================================
     STATISTICS
     ======================================================= */

  const totalNodes = graphData.nodes.length;
  const totalRelationships =
    graphData.links.length;

  const visibleNodes = filteredNodes.length;
  const visibleRelationships =
    filteredLinks.length;

  /* =======================================================
     USER INTERFACE
     ======================================================= */

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, #02060d 0%, #07111f 50%, #02060d 100%)',
        color: '#e6f7ff',
        fontFamily:
          'Inter, Arial, Helvetica, sans-serif',
        padding: '28px',
        boxSizing: 'border-box',
      }}
    >

      {/* =================================================
          HEADER
          ================================================= */}

      <div
        style={{
          marginBottom: '25px',
          borderBottom:
            '1px solid #16324a',
          paddingBottom: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background:
                'linear-gradient(135deg, #00e5ff, #2979ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '25px',
              boxShadow:
                '0 0 20px rgba(0,229,255,0.35)',
            }}
          >
            🛡️
          </div>

          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '31px',
                fontWeight: '700',
                letterSpacing: '-0.5px',
              }}
            >
              Cyber Threat Intelligence Graph
            </h1>

            <p
              style={{
                margin:
                  '6px 0 0 0',
                color: '#7fa6bd',
                fontSize: '14px',
              }}
            >
              Interactive Cybersecurity
              Intelligence & Threat Network
            </p>
          </div>
        </div>
      </div>

      {/* =================================================
          STATISTICS
          ================================================= */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(4, minmax(150px, 1fr))',
          gap: '15px',
          marginBottom: '20px',
        }}
      >
        <StatCard
          title="Total Nodes"
          value={totalNodes}
          icon="◉"
          accent="#00e5ff"
        />

        <StatCard
          title="Relationships"
          value={totalRelationships}
          icon="↔"
          accent="#2979ff"
        />

        <StatCard
          title="Visible Nodes"
          value={visibleNodes}
          icon="◈"
          accent="#00e676"
        />

        <StatCard
          title="Visible Links"
          value={visibleRelationships}
          icon="⌁"
          accent="#d500f9"
        />
      </div>

      {/* =================================================
          SEARCH + FILTER
          ================================================= */}

      <div
        style={{
          background:
            'rgba(7,17,31,0.95)',
          border:
            '1px solid #16324a',
          borderRadius: '12px',
          padding: '18px',
          marginBottom: '20px',
          display: 'flex',
          gap: '15px',
          alignItems: 'center',
          flexWrap: 'wrap',
          boxShadow:
            '0 8px 30px rgba(0,0,0,0.25)',
        }}
      >

        <div
          style={{
            flex: 1,
            minWidth: '250px',
          }}
        >
          <input
            type="text"
            placeholder="🔎  Search threat actors, malware, CVEs..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(
                e.target.value
              )
            }
            style={{
              width: '100%',
              padding: '13px 15px',
              boxSizing: 'border-box',
              borderRadius: '8px',
              border:
                '1px solid #23445c',
              background: '#030914',
              color: '#e6f7ff',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>

        <select
          value={filterType}
          onChange={(e) =>
            setFilterType(
              e.target.value
            )
          }
          style={{
            padding: '13px 15px',
            borderRadius: '8px',
            border:
              '1px solid #23445c',
            background: '#030914',
            color: '#e6f7ff',
            fontSize: '14px',
            cursor: 'pointer',
            minWidth: '180px',
          }}
        >
          {nodeTypes.map((type) => (
            <option
              key={type}
              value={type}
            >
              {type === 'All'
                ? 'All Node Types'
                : type}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            setSearchTerm('');
            setFilterType('All');
            setSelectedNode(null);
          }}
          style={{
            padding: '13px 20px',
            borderRadius: '8px',
            border:
              '1px solid #23445c',
            background:
              'linear-gradient(135deg, #123452, #0c2740)',
            color: '#dff9ff',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          Reset
        </button>
      </div>

      {/* =================================================
          MAIN CONTENT
          ================================================= */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(600px, 2.5fr) minmax(280px, 1fr)',
          gap: '20px',
        }}
      >

        {/* =================================================
            GRAPH PANEL
            ================================================= */}

        <div
          style={{
            background:
              'rgba(5,12,22,0.96)',
            border:
              '1px solid #16324a',
            borderRadius: '14px',
            padding: '15px',
            boxShadow:
              '0 10px 35px rgba(0,0,0,0.3)',
          }}
        >

          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '18px',
                  color: '#dff9ff',
                }}
              >
                Threat Relationship Network
              </h2>

              <div
                style={{
                  marginTop: '4px',
                  fontSize: '11px',
                  color: '#53758c',
                }}
              >
                LIVE GRAPH VISUALIZATION
              </div>
            </div>

            <span
              style={{
                color: '#64869c',
                fontSize: '12px',
              }}
            >
              Drag nodes • Scroll to zoom
            </span>
          </div>

          <div
            style={{
              overflow: 'auto',
              borderRadius: '10px',
            }}
          >
            <svg ref={svgRef}></svg>
          </div>
        </div>

        {/* =================================================
            RIGHT SIDEBAR
            ================================================= */}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >

          {/* NODE DETAILS */}

          <div
            style={{
              background:
                'rgba(7,17,31,0.96)',
              border:
                '1px solid #16324a',
              borderRadius: '14px',
              padding: '20px',
              boxShadow:
                '0 8px 25px rgba(0,0,0,0.25)',
            }}
          >

            <h2
              style={{
                marginTop: 0,
                fontSize: '18px',
                color: '#dff9ff',
              }}
            >
              Node Details
            </h2>

            {selectedNode ? (
              <div>

                <div
                  style={{
                    display:
                      'inline-block',
                    padding:
                      '5px 11px',
                    borderRadius:
                      '20px',
                    background:
                      colorScale[
                        selectedNode.type
                      ] ||
                      colorScale.Entity,
                    color: '#02060d',
                    fontSize: '11px',
                    fontWeight: '800',
                    marginBottom:
                      '15px',
                    boxShadow:
                      `0 0 12px ${
                        colorScale[
                          selectedNode.type
                        ] ||
                        colorScale.Entity
                      }`,
                  }}
                >
                  {selectedNode.type}
                </div>

                <h3
                  style={{
                    margin:
                      '5px 0 15px',
                    fontSize: '20px',
                    color: '#ffffff',
                  }}
                >
                  {selectedNode.label}
                </h3>

                <p
                  style={{
                    color: '#66899f',
                    fontSize: '12px',
                    textTransform:
                      'uppercase',
                    letterSpacing:
                      '1px',
                  }}
                >
                  Properties
                </p>

                <pre
                  style={{
                    background:
                      '#02060d',
                    border:
                      '1px solid #16324a',
                    padding: '12px',
                    borderRadius:
                      '8px',
                    overflow: 'auto',
                    fontSize: '12px',
                    color: '#a9d7e8',
                  }}
                >
                  {JSON.stringify(
                    selectedNode.details,
                    null,
                    2
                  )}
                </pre>
              </div>
            ) : (
              <div
                style={{
                  textAlign:
                    'center',
                  padding:
                    '25px 10px',
                }}
              >
                <div
                  style={{
                    fontSize: '35px',
                    marginBottom:
                      '10px',
                    opacity: 0.7,
                  }}
                >
                  🎯
                </div>

                <p
                  style={{
                    color: '#587b91',
                    lineHeight: '1.6',
                    fontSize: '13px',
                  }}
                >
                  Select a node in the
                  graph to inspect its
                  cybersecurity intelligence.
                </p>
              </div>
            )}
          </div>

          {/* LEGEND */}

          <div
            style={{
              background:
                'rgba(7,17,31,0.96)',
              border:
                '1px solid #16324a',
              borderRadius: '14px',
              padding: '20px',
              boxShadow:
                '0 8px 25px rgba(0,0,0,0.25)',
            }}
          >

            <h2
              style={{
                marginTop: 0,
                fontSize: '18px',
                color: '#dff9ff',
              }}
            >
              Intelligence Categories
            </h2>

            {Object.entries(colorScale)
              .filter(
                ([type]) =>
                  type !== 'Entity'
              )
              .map(
                ([type, color]) => (
                  <div
                    key={type}
                    style={{
                      display: 'flex',
                      alignItems:
                        'center',
                      gap: '11px',
                      marginBottom:
                        '12px',
                      fontSize: '13px',
                      color: '#b7d4e1',
                    }}
                  >

                    <span
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius:
                          '50%',
                        background:
                          color,
                        display:
                          'inline-block',
                        boxShadow:
                          `0 0 9px ${color}`,
                      }}
                    />

                    <span>
                      {type}
                    </span>
                  </div>
                )
              )}
          </div>

        </div>
      </div>

      {/* =================================================
          FOOTER
          ================================================= */}

      <div
        style={{
          marginTop: '20px',
          padding:
            '12px 15px',
          borderTop:
            '1px solid #16324a',
          color: '#426579',
          fontSize: '11px',
          textAlign: 'center',
          letterSpacing:
            '0.5px',
        }}
      >
        CYBER THREAT INTELLIGENCE PLATFORM
        &nbsp; • &nbsp;
        NEO4J + FASTAPI + REACT + D3.JS
      </div>

    </div>
  );
}

/* =========================================================
   STATISTICS CARD
   ========================================================= */

function StatCard({
  title,
  value,
  icon,
  accent,
}) {
  return (
    <div
      style={{
        background:
          'rgba(7,17,31,0.96)',
        border:
          '1px solid #16324a',
        borderRadius: '12px',
        padding: '18px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow:
          '0 8px 25px rgba(0,0,0,0.22)',
      }}
    >

      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '3px',
          background: accent,
          boxShadow:
            `0 0 12px ${accent}`,
        }}
      />

      <div
        style={{
          color: '#6f91a5',
          fontSize: '12px',
          marginBottom: '9px',
          textTransform:
            'uppercase',
          letterSpacing:
            '0.8px',
        }}
      >
        <span
          style={{
            color: accent,
            marginRight: '6px',
          }}
        >
          {icon}
        </span>

        {title}
      </div>

      <div
        style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#e6f7ff',
        }}
      >
        {value}
      </div>
    </div>
  );
}