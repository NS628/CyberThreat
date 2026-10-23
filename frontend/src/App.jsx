import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import "./App.css";
import {
  DEFAULT_NODES,
  DEFAULT_LINKS,
  DEFAULT_TIMELINE,
  DEFAULT_REPORTS,
} from "./mockData";

const API_BASE = "http://127.0.0.1:8000";

const colorScale = {
  ThreatActor: "#DC3545",
  Malware: "#F28C28",
  Technique: "#198754",
  Vulnerability: "#7C3AED",
  Campaign: "#EAB308",
  Industry: "#0056B3",
  Software: "#0891B2",
  Entity: "#64748B",
};

function computeMockStats(nodes, links) {
  const node_types = {};
  nodes.forEach((n) => {
    node_types[n.type] = (node_types[n.type] || 0) + 1;
  });

  const relationship_types = {};
  links.forEach((l) => {
    relationship_types[l.type] = (relationship_types[l.type] || 0) + 1;
  });

  return {
    total_nodes: nodes.length,
    total_relationships: links.length,
    node_types,
    relationship_types,
  };
}

function computeMockAnalytics(nodes, links) {
  const nodeTypeCounts = {};
  nodes.forEach((n) => {
    nodeTypeCounts[n.type] = (nodeTypeCounts[n.type] || 0) + 1;
  });

  const node_distribution = Object.entries(nodeTypeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const relCounts = {};
  links.forEach((l) => {
    relCounts[l.type] = (relCounts[l.type] || 0) + 1;
  });

  const relationship_distribution = Object.entries(relCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const connectionCounts = {};
  links.forEach((l) => {
    const s = typeof l.source === "object" ? l.source.id : l.source;
    const t = typeof l.target === "object" ? l.target.id : l.target;
    connectionCounts[s] = (connectionCounts[s] || 0) + 1;
    connectionCounts[t] = (connectionCounts[t] || 0) + 1;
  });

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const central_entities = Object.entries(connectionCounts)
    .map(([id, connections]) => {
      const node = nodeMap.get(id);
      return {
        name: node ? node.label : id,
        type: node ? node.type : "Entity",
        connections,
      };
    })
    .sort((a, b) => b.connections - a.connections)
    .slice(0, 10);

  return {
    node_distribution,
    relationship_distribution,
    central_entities,
  };
}

export default function App() {
  const svgRef = useRef(null);
  const zoomRef = useRef(null);

  const [graphData, setGraphData] = useState({
    nodes: DEFAULT_NODES,
    links: DEFAULT_LINKS,
  });

  const [stats, setStats] = useState(() =>
    computeMockStats(DEFAULT_NODES, DEFAULT_LINKS)
  );

  const [analytics, setAnalytics] = useState(() =>
    computeMockAnalytics(DEFAULT_NODES, DEFAULT_LINKS)
  );

  const [backendOnline, setBackendOnline] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [selectedNode, setSelectedNode] = useState(null);

  const [investigateActor, setInvestigateActor] = useState("");
  const [investigationData, setInvestigationData] = useState(null);
  const [investigating, setInvestigating] = useState(false);
  const [investigationError, setInvestigationError] = useState("");

  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("Dashboard");

  // Filtered views for Graph Explorer & Timeline
  const [explorerSearch, setExplorerSearch] = useState("");
  const [timelineFilter, setTimelineFilter] = useState("All");
  const [selectedReport, setSelectedReport] = useState(null);

  const nodeTypes = useMemo(() => {
    const types = Object.keys(stats.node_types || {});
    return ["All", ...types];
  }, [stats]);

  // ============================================================
  // LOAD GRAPH
  // ============================================================
  async function loadGraph(search = "", nodeType = "All") {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (nodeType !== "All") params.set("node_type", nodeType);
      params.set("limit", "250");

      const response = await fetch(`${API_BASE}/api/graph?${params.toString()}`);
      if (!response.ok) throw new Error("Backend offline");

      const data = await response.json();
      if (data && data.nodes && data.nodes.length > 0) {
        setGraphData({
          nodes: data.nodes || [],
          links: data.links || [],
        });
        setBackendOnline(true);
        return;
      }
    } catch {
      // Backend not running or returned empty: fallback to rich client-side data
      setBackendOnline(false);
    }

    // Local filtering
    let filteredNodes = DEFAULT_NODES;
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      filteredNodes = filteredNodes.filter((n) =>
        n.label.toLowerCase().includes(query)
      );
    }
    if (nodeType !== "All") {
      filteredNodes = filteredNodes.filter((n) => n.type === nodeType);
    }

    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredLinks = DEFAULT_LINKS.filter((l) => {
      const s = typeof l.source === "object" ? l.source.id : l.source;
      const t = typeof l.target === "object" ? l.target.id : l.target;
      return nodeIds.has(s) && nodeIds.has(t);
    });

    setGraphData({
      nodes: filteredNodes,
      links: filteredLinks,
    });
  }

  // ============================================================
  // LOAD STATS
  // ============================================================
  async function loadStats() {
    try {
      const response = await fetch(`${API_BASE}/api/stats`);
      if (!response.ok) throw new Error("Stats offline");
      const data = await response.json();
      if (data && data.total_nodes) {
        setStats({
          total_nodes: data.total_nodes || 0,
          total_relationships: data.total_relationships || 0,
          node_types: data.node_types || {},
          relationship_types: data.relationship_types || {},
        });
        setBackendOnline(true);
        return;
      }
    } catch {
      // fallback
    }
    setStats(computeMockStats(DEFAULT_NODES, DEFAULT_LINKS));
  }

  // ============================================================
  // LOAD ANALYTICS
  // ============================================================
  async function loadAnalytics() {
    setAnalyticsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/analytics`);
      if (!response.ok) throw new Error("Analytics offline");
      const data = await response.json();
      if (data && data.node_distribution && data.node_distribution.length > 0) {
        setAnalytics({
          node_distribution: data.node_distribution || [],
          relationship_distribution: data.relationship_distribution || [],
          central_entities: data.central_entities || [],
        });
        setBackendOnline(true);
        setAnalyticsLoading(false);
        return;
      }
    } catch {
      // fallback
    }
    setAnalytics(computeMockAnalytics(DEFAULT_NODES, DEFAULT_LINKS));
    setAnalyticsLoading(false);
  }

  // ============================================================
  // INVESTIGATE THREAT ACTOR
  // ============================================================
  async function investigateThreatActor(actorName) {
    const name = actorName.trim();
    if (!name) {
      setInvestigationError("Enter a threat actor name.");
      return;
    }

    setInvestigating(true);
    setInvestigationError("");
    setInvestigationData(null);
    setSelectedNode(null);

    try {
      const response = await fetch(
        `${API_BASE}/api/investigate/${encodeURIComponent(name)}`
      );
      if (response.ok) {
        const data = await response.json();
        setInvestigationData(data);
        setGraphData({
          nodes: data.nodes || [],
          links: data.links || [],
        });
        setActiveSection("Investigate");
        setInvestigating(false);
        return;
      }
    } catch {
      // fallback
    }

    // Local client-side investigation lookup
    const foundActor = DEFAULT_NODES.find(
      (n) =>
        n.type === "ThreatActor" &&
        n.label.toLowerCase().includes(name.toLowerCase())
    );

    if (!foundActor) {
      setInvestigationError(
        `Threat actor '${actorName}' was not found. Try searching for 'APT29', 'APT28', 'Volt Typhoon', or 'Lazarus Group'.`
      );
      setInvestigating(false);
      return;
    }

    // Find 1st & 2nd hop nodes
    const actorId = foundActor.id;
    const directLinks = DEFAULT_LINKS.filter(
      (l) => l.source === actorId || l.target === actorId
    );
    const connectedIds = new Set([actorId]);
    directLinks.forEach((l) => {
      connectedIds.add(l.source);
      connectedIds.add(l.target);
    });

    // 2nd hop
    const secondaryLinks = DEFAULT_LINKS.filter(
      (l) =>
        (connectedIds.has(l.source) || connectedIds.has(l.target)) &&
        !directLinks.includes(l)
    );
    secondaryLinks.forEach((l) => {
      connectedIds.add(l.source);
      connectedIds.add(l.target);
    });

    const resultNodes = DEFAULT_NODES.filter((n) => connectedIds.has(n.id));
    const allLinks = [...directLinks, ...secondaryLinks];

    const resultData = {
      actor: foundActor.label,
      nodes: resultNodes,
      links: allLinks,
    };

    setInvestigationData(resultData);
    setGraphData({
      nodes: resultNodes,
      links: allLinks,
    });
    setSelectedNode(foundActor);
    setActiveSection("Investigate");
    setInvestigating(false);
  }

  // ============================================================
  // RESET DASHBOARD
  // ============================================================
  function resetDashboard() {
    setSearchTerm("");
    setFilterType("All");
    setInvestigationData(null);
    setInvestigationError("");
    setInvestigateActor("");
    setSelectedNode(null);
    loadGraph("", "All");
    loadStats();
  }

  // ============================================================
  // INITIAL LOAD
  // ============================================================
  useEffect(() => {
    loadGraph();
    loadStats();
    loadAnalytics();
  }, []);

  // ============================================================
  // D3 GRAPH
  // ============================================================
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.parentElement?.clientWidth || 900;
    const height = 620;

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const nodes = graphData.nodes.map((node) => ({ ...node }));
    const links = graphData.links.map((link) => ({ ...link }));

    if (!nodes.length) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "#64748B")
        .attr("font-size", "15px")
        .text("No intelligence data found matching query");
      return;
    }

    const container = svg.append("g");

    const zoom = d3
      .zoom()
      .scaleExtent([0.25, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Markers for links
    container
      .append("defs")
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 22)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#94A3B8");

    const link = container
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#CBD5E1")
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrow)");

    const linkLabel = container
      .append("g")
      .selectAll("text")
      .data(links)
      .join("text")
      .attr("font-size", 9)
      .attr("fill", "#64748B")
      .attr("text-anchor", "middle")
      .text((d) => d.type || "RELATED_TO");

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance(110)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(38));

    const node = container
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", "graph-node")
      .style("cursor", "pointer")
      .on("click", (_, d) => {
        setSelectedNode(d);
      })
      .call(
        d3
          .drag()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    node
      .append("circle")
      .attr("r", (d) => (d.type === "ThreatActor" ? 15 : 11))
      .attr("fill", (d) => colorScale[d.type] || colorScale.Entity)
      .attr("stroke", "#FFFFFF")
      .attr("stroke-width", 2.5);

    node
      .append("text")
      .attr("x", 18)
      .attr("y", 4)
      .attr("font-size", 11)
      .attr("font-weight", (d) => (d.type === "ThreatActor" ? 700 : 500))
      .attr("fill", "#1E293B")
      .text((d) => d.label);

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      linkLabel
        .attr("x", (d) => (d.source.x + d.target.x) / 2)
        .attr("y", (d) => (d.source.y + d.target.y) / 2);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graphData]);

  // ============================================================
  // RESET ZOOM
  // ============================================================
  function resetZoom() {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(400)
      .call(zoomRef.current.transform, d3.zoomIdentity);
  }

  // ============================================================
  // SEARCH
  // ============================================================
  function handleSearch(event) {
    event.preventDefault();
    loadGraph(searchTerm, filterType);
  }

  const threatActors = stats.node_types?.ThreatActor || 0;
  const campaigns = stats.node_types?.Campaign || 0;
  const malware = stats.node_types?.Malware || 0;
  const vulnerabilities = stats.node_types?.Vulnerability || 0;

  // Filtered timeline data
  const filteredTimeline = DEFAULT_TIMELINE.filter(
    (item) => timelineFilter === "All" || item.severity === timelineFilter
  );

  // Filtered explorer data
  const filteredExplorerNodes = DEFAULT_NODES.filter(
    (n) =>
      !explorerSearch.trim() ||
      n.label.toLowerCase().includes(explorerSearch.trim().toLowerCase()) ||
      n.type.toLowerCase().includes(explorerSearch.trim().toLowerCase())
  );

  return (
    <div className="app-shell">
      {/* ======================================================
          SIDEBAR
      ====================================================== */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">◈</div>
          <div>
            <div className="brand-title">CTI Graph</div>
            <div className="brand-subtitle">Cyber Threat Intelligence</div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">PLATFORM</div>
          {[
            "Dashboard",
            "Investigate",
            "Analytics",
            "Timeline",
            "Graph Explorer",
            "Reports",
          ].map((item) => (
            <button
              key={item}
              className={`sidebar-item ${
                activeSection === item ? "active" : ""
              }`}
              onClick={() => {
                setActiveSection(item);
                if (item === "Dashboard") resetDashboard();
                if (item === "Analytics") loadAnalytics();
              }}
            >
              <span className="sidebar-dot" />
              {item}
            </button>
          ))}
        </div>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span
              className="status-indicator"
              style={{
                background: backendOnline ? "#198754" : "#0284c7",
                boxShadow: backendOnline
                  ? "0 0 0 4px #dff5e8"
                  : "0 0 0 4px #e0f2fe",
              }}
            />
            <div>
              <strong>
                {backendOnline ? "Neo4j Connected" : "Local Intel Mode"}
              </strong>
              <span>
                {backendOnline ? "Live API sync active" : "Full dataset loaded"}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}
      <main className="main-content">
        {/* TOP BAR */}
        <header className="topbar">
          <div>
            <div className="breadcrumb">
              Security Intelligence
              <span>/</span>
              {activeSection}
            </div>
            <h1>{activeSection}</h1>
          </div>

          <div className="topbar-right">
            <div className="connection-pill">
              <span
                style={{
                  background: backendOnline ? "#198754" : "#0284c7",
                }}
              />
              {backendOnline ? "Live Neo4j Sync" : "Enterprise Sandbox"}
            </div>
            <div className="avatar">CTI</div>
          </div>
        </header>

        {/* ====================================================
            DASHBOARD HERO
        ==================================================== */}
        {activeSection === "Dashboard" && (
          <section className="hero">
            <div>
              <div className="eyebrow">
                CYBER THREAT INTELLIGENCE PLATFORM
              </div>
              <h2>Understand the threat landscape.</h2>
              <p>
                Explore relationships between threat actors, malware,
                vulnerabilities, techniques, and targeted industries in a clean,
                high-visibility intelligence workspace.
              </p>
            </div>

            <div className="hero-badge">
              <span>●</span>
              Live Intelligence Graph
            </div>
          </section>
        )}

        {/* ====================================================
            INVESTIGATION PANEL
        ==================================================== */}
        {(activeSection === "Investigate" || investigationData) && (
          <section className="investigation-panel">
            <div className="section-heading">
              <div>
                <div className="eyebrow">THREAT ACTOR INVESTIGATION</div>
                <h2>Investigate a threat actor</h2>
                <p>
                  Enter a threat actor name to isolate and explore its connected
                  tactics, tools, and campaigns.
                </p>
              </div>
            </div>

            <form
              className="investigation-search"
              onSubmit={(event) => {
                event.preventDefault();
                investigateThreatActor(investigateActor);
              }}
            >
              <input
                value={investigateActor}
                onChange={(event) => setInvestigateActor(event.target.value)}
                placeholder="Example: APT29, Volt Typhoon, Lazarus Group..."
              />
              <button type="submit" disabled={investigating}>
                {investigating ? "Investigating..." : "Investigate"}
              </button>
            </form>

            {investigationError && (
              <div className="investigation-error">{investigationError}</div>
            )}

            {investigationData && (
              <div className="investigation-summary">
                <div className="investigation-title">
                  <span className="actor-indicator" />
                  <div>
                    <span>INVESTIGATION RESULT</span>
                    <strong>{investigationData.actor}</strong>
                  </div>
                </div>

                <div className="investigation-counts">
                  <div>
                    <strong>{investigationData.nodes?.length}</strong>
                    <span>Connected entities</span>
                  </div>
                  <div>
                    <strong>{investigationData.links?.length}</strong>
                    <span>Relationships</span>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ====================================================
            ANALYTICS SECTION
        ==================================================== */}
        {activeSection === "Analytics" && (
          <section className="analytics-page">
            <div className="analytics-header">
              <div>
                <div className="eyebrow">GRAPH INTELLIGENCE</div>
                <h2>Security Analytics</h2>
                <p>
                  Statistical overview of entities, relationships, and highly
                  connected intelligence nodes within the threat graph.
                </p>
              </div>

              <button className="refresh-button" onClick={loadAnalytics}>
                ↻ Refresh analytics
              </button>
            </div>

            {analyticsLoading ? (
              <div className="analytics-loading">
                <div className="loading-spinner" />
                Loading intelligence analytics...
              </div>
            ) : (
              <>
                <div className="analytics-summary-grid">
                  <div className="analytics-summary-card">
                    <span>TOTAL ENTITIES</span>
                    <strong>{stats.total_nodes.toLocaleString()}</strong>
                    <small>Nodes in intelligence graph</small>
                  </div>

                  <div className="analytics-summary-card">
                    <span>RELATIONSHIPS</span>
                    <strong>{stats.total_relationships.toLocaleString()}</strong>
                    <small>Known graph connections</small>
                  </div>

                  <div className="analytics-summary-card">
                    <span>MALWARE</span>
                    <strong>{malware.toLocaleString()}</strong>
                    <small>Malware entities</small>
                  </div>

                  <div className="analytics-summary-card">
                    <span>VULNERABILITIES</span>
                    <strong>{vulnerabilities.toLocaleString()}</strong>
                    <small>Vulnerability entities</small>
                  </div>
                </div>

                <div className="analytics-grid">
                  <div className="analytics-card">
                    <div className="analytics-card-header">
                      <div>
                        <h3>Entity Distribution</h3>
                        <p>Composition of the CTI graph</p>
                      </div>
                    </div>

                    <div className="bar-chart">
                      {analytics.node_distribution.map((item) => {
                        const max = Math.max(
                          ...analytics.node_distribution.map((x) => x.count),
                          1
                        );
                        const percentage = (item.count / max) * 100;

                        return (
                          <div className="bar-row" key={item.type}>
                            <div className="bar-label">
                              <span
                                className="bar-dot"
                                style={{
                                  background:
                                    colorScale[item.type] || colorScale.Entity,
                                }}
                              />
                              <span>{item.type}</span>
                              <strong>{item.count.toLocaleString()}</strong>
                            </div>
                            <div className="bar-track">
                              <div
                                className="bar-fill"
                                style={{
                                  width: `${percentage}%`,
                                  background:
                                    colorScale[item.type] || colorScale.Entity,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="analytics-card">
                    <div className="analytics-card-header">
                      <div>
                        <h3>Relationship Types</h3>
                        <p>Connections between entities</p>
                      </div>
                    </div>

                    <div className="bar-chart">
                      {analytics.relationship_distribution
                        .slice(0, 12)
                        .map((item) => {
                          const max = Math.max(
                            ...analytics.relationship_distribution.map(
                              (x) => x.count
                            ),
                            1
                          );
                          const percentage = (item.count / max) * 100;

                          return (
                            <div className="bar-row" key={item.type}>
                              <div className="bar-label">
                                <span className="relationship-symbol">→</span>
                                <span>{item.type}</span>
                                <strong>{item.count.toLocaleString()}</strong>
                              </div>
                              <div className="bar-track">
                                <div
                                  className="bar-fill relationship"
                                  style={{
                                    width: `${percentage}%`,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                <div className="analytics-card central-card">
                  <div className="analytics-card-header">
                    <div>
                      <h3>Most Connected Entities</h3>
                      <p>Entities with the highest number of graph connections</p>
                    </div>
                    <div className="central-badge">NETWORK</div>
                  </div>

                  <div className="central-table">
                    <div className="central-table-header">
                      <span>#</span>
                      <span>ENTITY</span>
                      <span>TYPE</span>
                      <span>CONNECTIONS</span>
                    </div>

                    {analytics.central_entities.map((entity, index) => (
                      <div
                        className="central-table-row"
                        key={`${entity.name}-${index}`}
                      >
                        <span className="rank-number">{index + 1}</span>
                        <span className="central-name">{entity.name}</span>
                        <span>
                          <span
                            className="type-pill"
                            style={{
                              color:
                                colorScale[entity.type] || colorScale.Entity,
                              background: `${
                                colorScale[entity.type] || colorScale.Entity
                              }15`,
                            }}
                          >
                            {entity.type}
                          </span>
                        </span>
                        <span className="connection-count">
                          {entity.connections.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {/* ====================================================
            STATS SUMMARY (Dashboard & Investigate views)
        ==================================================== */}
        {activeSection !== "Analytics" &&
          activeSection !== "Timeline" &&
          activeSection !== "Graph Explorer" &&
          activeSection !== "Reports" && (
            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon blue">◉</div>
                <div>
                  <span>Total Entities</span>
                  <strong>{stats.total_nodes.toLocaleString()}</strong>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon red">⚠</div>
                <div>
                  <span>Relationships</span>
                  <strong>{stats.total_relationships.toLocaleString()}</strong>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon orange">◈</div>
                <div>
                  <span>Threat Actors</span>
                  <strong>{threatActors.toLocaleString()}</strong>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon purple">◆</div>
                <div>
                  <span>Campaigns</span>
                  <strong>{campaigns.toLocaleString()}</strong>
                </div>
              </div>
            </section>
          )}

        {/* ====================================================
            GRAPH WORKSPACE (Dashboard & Investigate views)
        ==================================================== */}
        {activeSection !== "Analytics" &&
          activeSection !== "Timeline" &&
          activeSection !== "Graph Explorer" &&
          activeSection !== "Reports" && (
            <section className="workspace">
              <div className="graph-card">
                <div className="card-header">
                  <div>
                    <h3>Threat Intelligence Graph</h3>
                    <p>Interactive relationship network • Pan, zoom & drag</p>
                  </div>
                  <button className="reset-zoom" onClick={resetZoom}>
                    Reset view
                  </button>
                </div>

                <form className="graph-toolbar" onSubmit={handleSearch}>
                  <div className="search-box">
                    <span>⌕</span>
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search threat intelligence..."
                    />
                  </div>

                  <select
                    value={filterType}
                    onChange={(event) => {
                      const value = event.target.value;
                      setFilterType(value);
                      loadGraph(searchTerm, value);
                    }}
                  >
                    {nodeTypes.map((type) => (
                      <option value={type} key={type}>
                        {type === "All" ? "All entity types" : type}
                      </option>
                    ))}
                  </select>

                  <button className="search-button" type="submit">
                    Search
                  </button>
                  <button
                    className="clear-button"
                    type="button"
                    onClick={resetDashboard}
                  >
                    Clear
                  </button>
                </form>

                <div className="graph-container">
                  <svg ref={svgRef} />
                </div>

                <div className="legend">
                  {Object.entries(colorScale)
                    .filter(([type]) => nodeTypes.includes(type))
                    .map(([type, color]) => (
                      <div className="legend-item" key={type}>
                        <span style={{ background: color }} />
                        {type}
                      </div>
                    ))}
                </div>
              </div>

              {/* INSPECTOR */}
              <aside className="inspector">
                <div className="inspector-header">
                  <div>
                    <span className="eyebrow">ENTITY INSPECTOR</span>
                    <h3>Selected entity</h3>
                  </div>
                </div>

                {selectedNode ? (
                  <div className="entity-details">
                    <div
                      className="entity-type"
                      style={{
                        color:
                          colorScale[selectedNode.type] || colorScale.Entity,
                      }}
                    >
                      {selectedNode.type}
                    </div>

                    <h2>{selectedNode.label}</h2>

                    <div className="detail-list">
                      {Object.entries(selectedNode.details || {}).map(
                        ([key, value]) => (
                          <div className="detail-row" key={key}>
                            <span>{key.replace(/_/g, " ").toUpperCase()}</span>
                            <strong>{String(value)}</strong>
                          </div>
                        )
                      )}
                    </div>

                    {selectedNode.type === "ThreatActor" && (
                      <button
                        className="inspect-action"
                        onClick={() =>
                          investigateThreatActor(selectedNode.label)
                        }
                      >
                        Investigate this actor →
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="empty-inspector">
                    <div className="empty-icon">◎</div>
                    <h4>No entity selected</h4>
                    <p>
                      Click any node in the graph to inspect its intelligence
                      details and metadata.
                    </p>
                  </div>
                )}
              </aside>
            </section>
          )}

        {/* ====================================================
            TIMELINE MODULE
        ==================================================== */}
        {activeSection === "Timeline" && (
          <section className="timeline-page">
            <div className="section-toolbar-header">
              <div>
                <div className="eyebrow">CHRONOLOGICAL INTELLIGENCE</div>
                <h2>Threat Campaign Timeline</h2>
                <p>
                  Historical progression of notable adversary campaigns, zero-day
                  exploitations, and destructive cyber operations.
                </p>
              </div>

              <div className="timeline-filter-group">
                {["All", "Critical", "Emergency", "High"].map((level) => (
                  <button
                    key={level}
                    className={`timeline-pill ${
                      timelineFilter === level ? "active" : ""
                    }`}
                    onClick={() => setTimelineFilter(level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="timeline-container">
              {filteredTimeline.map((item) => (
                <div className="timeline-card" key={item.id}>
                  <div className="timeline-date-col">
                    <span className="timeline-badge-date">{item.date}</span>
                    <span className={`severity-tag ${item.severity.toLowerCase()}`}>
                      {item.severity}
                    </span>
                  </div>

                  <div className="timeline-content">
                    <div className="timeline-card-header">
                      <h3>{item.title}</h3>
                      <span className="timeline-badge-actor">
                        {item.actor}
                      </span>
                    </div>

                    <p className="timeline-summary">{item.summary}</p>

                    <div className="timeline-footer">
                      <span className="timeline-mitre">
                        <strong>MITRE ATT&CK:</strong> {item.mitre}
                      </span>
                      <button
                        className="timeline-action-btn"
                        onClick={() => {
                          setInvestigateActor(item.actor);
                          investigateThreatActor(item.actor);
                        }}
                      >
                        Investigate Actor →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ====================================================
            GRAPH EXPLORER MODULE
        ==================================================== */}
        {activeSection === "Graph Explorer" && (
          <section className="explorer-page">
            <div className="section-toolbar-header">
              <div>
                <div className="eyebrow">DIRECTORY & INDEX</div>
                <h2>Threat Intelligence Directory</h2>
                <p>
                  Search and inspect indexed adversaries, techniques, malware
                  families, and vulnerabilities.
                </p>
              </div>

              <div className="explorer-search-input">
                <span>⌕</span>
                <input
                  value={explorerSearch}
                  onChange={(e) => setExplorerSearch(e.target.value)}
                  placeholder="Filter entities by name or type..."
                />
              </div>
            </div>

            <div className="explorer-grid">
              {filteredExplorerNodes.map((n) => (
                <div className="explorer-card" key={n.id}>
                  <div className="explorer-card-header">
                    <span
                      className="type-pill"
                      style={{
                        color: colorScale[n.type] || colorScale.Entity,
                        background: `${
                          colorScale[n.type] || colorScale.Entity
                        }15`,
                      }}
                    >
                      {n.type}
                    </span>
                    <span className="explorer-id">{n.id}</span>
                  </div>

                  <h3 className="explorer-label">{n.label}</h3>

                  <div className="explorer-props">
                    {Object.entries(n.details || {})
                      .slice(0, 3)
                      .map(([k, v]) => (
                        <div className="explorer-prop-row" key={k}>
                          <span>{k.replace(/_/g, " ")}:</span>
                          <strong>{String(v)}</strong>
                        </div>
                      ))}
                  </div>

                  <button
                    className="explorer-inspect-btn"
                    onClick={() => {
                      setSelectedNode(n);
                      setActiveSection("Dashboard");
                    }}
                  >
                    View in Graph →
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ====================================================
            REPORTS MODULE
        ==================================================== */}
        {activeSection === "Reports" && (
          <section className="reports-page">
            <div className="section-toolbar-header">
              <div>
                <div className="eyebrow">THREAT DOSSIERS</div>
                <h2>Strategic Intelligence Reports</h2>
                <p>
                  Finished intelligence assessments, threat actor profiles, and
                  technical countermeasures.
                </p>
              </div>

              <button
                className="export-btn"
                onClick={() => window.print()}
              >
                ⎙ Export / Print Intel Dossier
              </button>
            </div>

            <div className="reports-grid">
              {DEFAULT_REPORTS.map((rep) => (
                <div
                  className={`report-card ${
                    selectedReport?.id === rep.id ? "selected" : ""
                  }`}
                  key={rep.id}
                  onClick={() => setSelectedReport(rep)}
                >
                  <div className="report-card-top">
                    <span className="report-code">{rep.code}</span>
                    <span className="report-classification">
                      {rep.classification}
                    </span>
                  </div>

                  <h3>{rep.title}</h3>
                  <div className="report-meta">
                    <span>{rep.author}</span>
                    <span>•</span>
                    <span>{rep.date}</span>
                  </div>

                  <p className="report-summary">{rep.summary}</p>

                  <div className="report-takeaway">
                    <strong>Key Defensive Recommendation:</strong>
                    <p>{rep.keyTakeaway}</p>
                  </div>

                  <div className="report-tags">
                    {rep.tags.map((tag) => (
                      <span className="report-tag" key={tag}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ====================================================
            FOOTER
        ==================================================== */}
        <footer>
          <span>
            CTI Graph • Cyber Threat Intelligence Visualization Platform
          </span>
          <span>
            {backendOnline
              ? "Live Engine: FastAPI • Neo4j • React • D3.js"
              : "Enterprise Standalone Sandbox • Ready for Neo4j deployment"}
          </span>
        </footer>
      </main>
    </div>
  );
}