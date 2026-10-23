import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import "./App.css";

const API_BASE = "http://127.0.0.1:8000";

const COLORS = {
  ThreatActor: "#DC3545",
  Malware: "#F28C28",
  Technique: "#198754",
  Vulnerability: "#0056B3",
  Campaign: "#7C3AED",
  Industry: "#64748B",
  Software: "#0891B2",
  Entity: "#64748B",
};

function App() {
  const svgRef = useRef(null);

  const [graph, setGraph] = useState({ nodes: [], links: [] });
  const [stats, setStats] = useState({
    total_nodes: 0,
    total_relationships: 0,
    node_types: {},
    relationship_types: {},
  });

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [nodeType, setNodeType] = useState("");
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const nodeTypes = useMemo(() => {
    const types = new Set();

    graph.nodes.forEach((node) => {
      if (node.type) types.add(node.type);
    });

    return Array.from(types).sort();
  }, [graph.nodes]);

  async function loadGraph(searchValue = "", typeValue = "") {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (searchValue.trim()) {
        params.set("search", searchValue.trim());
      }

      if (typeValue) {
        params.set("node_type", typeValue);
      }

      params.set("limit", "250");

      const response = await fetch(
        `${API_BASE}/api/graph?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Unable to load graph data.");
      }

      const data = await response.json();

      setGraph({
        nodes: data.nodes || [],
        links: data.links || [],
      });

      setSelectedNode(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const response = await fetch(`${API_BASE}/api/stats`);

      if (!response.ok) {
        throw new Error("Unable to load statistics.");
      }

      const data = await response.json();

      setStats(data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadGraph();
    loadStats();
  }, []);

  useEffect(() => {
    if (!svgRef.current || graph.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);

    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 900;
    const height = svgRef.current.clientHeight || 620;

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const container = svg
      .append("g")
      .attr("class", "graph-viewport");

    const zoom = d3
      .zoom()
      .scaleExtent([0.25, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoom);

    const defs = svg.append("defs");

    const shadow = defs
      .append("filter")
      .attr("id", "node-shadow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");

    shadow
      .append("feDropShadow")
      .attr("dx", "0")
      .attr("dy", "2")
      .attr("stdDeviation", "3")
      .attr("flood-color", "#64748B")
      .attr("flood-opacity", "0.25");

    const nodes = graph.nodes.map((node) => ({ ...node }));

    const links = graph.links.map((link) => ({
      ...link,
      source: link.source,
      target: link.target,
    }));

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance(90)
          .strength(0.35)
      )
      .force("charge", d3.forceManyBody().strength(-240))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(26))
      .alphaDecay(0.025);

    const linkGroup = container
      .append("g")
      .attr("class", "links");

    const link = linkGroup
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("class", "graph-link");

    const nodeGroup = container
      .append("g")
      .attr("class", "nodes");

    const node = nodeGroup
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", "graph-node")
      .style("cursor", "pointer")
      .call(
        d3
          .drag()
          .on("start", dragStarted)
          .on("drag", dragged)
          .on("end", dragEnded)
      );

    node
      .append("circle")
      .attr("r", (d) => {
        if (d.type === "ThreatActor") return 12;
        if (d.type === "Malware") return 9;
        return 7;
      })
      .attr("fill", (d) => COLORS[d.type] || COLORS.Entity)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)
      .attr("filter", "url(#node-shadow)");

    node
      .append("text")
      .attr("class", "node-label")
      .attr("dx", 12)
      .attr("dy", 4)
      .text((d) => {
        const label = d.label || "Unknown";
        return label.length > 28
          ? `${label.substring(0, 28)}…`
          : label;
      });

    node.on("click", (event, d) => {
      event.stopPropagation();

      setSelectedNode(d);

      node
        .select("circle")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 2);

      d3.select(event.currentTarget)
        .select("circle")
        .attr("stroke", COLORS[d.type] || COLORS.Entity)
        .attr("stroke-width", 4);
    });

    svg.on("click", () => {
      setSelectedNode(null);

      node
        .select("circle")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 2);
    });

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr(
        "transform",
        (d) => `translate(${d.x},${d.y})`
      );
    });

    function dragStarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();

      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragEnded(event, d) {
      if (!event.active) simulation.alphaTarget(0);

      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [graph]);

  function handleSearch() {
    setSearch(searchInput);
    loadGraph(searchInput, nodeType);
  }

  function handleReset() {
    setSearchInput("");
    setSearch("");
    setNodeType("");
    loadGraph("", "");
  }

  const threatActors =
    stats.node_types?.ThreatActor ??
    stats.node_types?.["Threat Actor"] ??
    0;

  const campaigns =
    stats.node_types?.Campaign ??
    0;

  return (
    <div className="app-shell">

      {/* ================= SIDEBAR ================= */}

      <aside className="sidebar">

        <div className="brand">
          <div className="brand-icon">🛡</div>

          <div>
            <div className="brand-title">CTI</div>
            <div className="brand-subtitle">
              Threat Intelligence Platform
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">

          <div className="nav-item active">
            <span className="nav-icon">⌂</span>
            <span>Dashboard</span>
          </div>

          <div className="nav-item">
            <span className="nav-icon">⌕</span>
            <span>Investigate</span>
          </div>

          <div className="nav-item">
            <span className="nav-icon">▥</span>
            <span>Analytics</span>
          </div>

          <div className="nav-item">
            <span className="nav-icon">◷</span>
            <span>Timeline</span>
          </div>

          <div className="nav-item">
            <span className="nav-icon">⌘</span>
            <span>Graph Explorer</span>
          </div>

          <div className="nav-item">
            <span className="nav-icon">▤</span>
            <span>Reports</span>
          </div>

        </nav>

        <div className="sidebar-bottom">

          <div className="mitre-mark">◎</div>

          <div className="mitre-title">
            MITRE ATT&CK
          </div>

          <div className="mitre-subtitle">
            Knowledge Graph
          </div>

          <p>
            From data to intelligence.
            <br />
            From intelligence to action.
          </p>

        </div>

      </aside>

      {/* ================= MAIN ================= */}

      <main className="main-content">

        {/* TOP BAR */}

        <header className="topbar">

          <div className="top-search">

            <span className="top-search-icon">⌕</span>

            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="Search threat actor, malware, technique, campaign..."
            />

          </div>

          <div className="topbar-right">

            <div className="connection-status">
              <span className="connection-dot"></span>
              Neo4j Connected
            </div>

            <div className="top-divider"></div>

            <div className="top-icon">♧</div>

            <div className="user-avatar">N</div>

          </div>

        </header>

        {/* PAGE */}

        <div className="page-content">

          {/* HERO */}

          <section className="hero-section">

            <div>

              <div className="eyebrow">
                CYBER THREAT INTELLIGENCE
              </div>

              <h1>
                Threat Intelligence Graph
              </h1>

              <p>
                MITRE ATT&CK powered cyber intelligence visualization
              </p>

            </div>

            <div className="mitre-badge">
              MITRE ATT&CK
            </div>

          </section>

          {/* STAT CARDS */}

          <section className="stats-grid">

            <StatCard
              icon="⌘"
              label="TOTAL NODES"
              value={stats.total_nodes?.toLocaleString() || "0"}
              description="MITRE ATT&CK"
              type="blue"
            />

            <StatCard
              icon="↔"
              label="RELATIONSHIPS"
              value={
                stats.total_relationships?.toLocaleString() || "0"
              }
              description="GRAPH CONNECTIONS"
              type="green"
            />

            <StatCard
              icon="●"
              label="THREAT ACTORS"
              value={threatActors.toLocaleString()}
              description="INTRUSION SETS"
              type="red"
            />

            <StatCard
              icon="◎"
              label="CAMPAIGNS"
              value={campaigns.toLocaleString()}
              description="ATT&CK CAMPAIGNS"
              type="purple"
            />

          </section>

          {/* SEARCH TOOLBAR */}

          <section className="toolbar-card">

            <div className="toolbar-search">

              <span>⌕</span>

              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                placeholder="Search threat actor, malware, technique, campaign..."
              />

            </div>

            <select
              value={nodeType}
              onChange={(e) => {
                setNodeType(e.target.value);
                loadGraph(searchInput, e.target.value);
              }}
              className="type-select"
            >

              <option value="">
                All Intelligence Types
              </option>

              {nodeTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}

            </select>

            <button
              className="filter-button"
              onClick={handleSearch}
            >
              ⌕ Search
            </button>

            <button
              className="reset-button"
              onClick={handleReset}
            >
              ↻ Reset
            </button>

          </section>

          {/* GRAPH + INSPECTOR */}

          <section className="workspace">

            {/* GRAPH */}

            <div className="graph-card">

              <div className="card-header">

                <div className="card-header-left">

                  <div className="card-header-icon">
                    ⌘
                  </div>

                  <div>

                    <h2>
                      Intelligence Network
                    </h2>

                    <div className="graph-count">

                      <span>
                        {graph.nodes.length}
                      </span>

                      nodes

                      <span className="count-dot">•</span>

                      <span>
                        {graph.links.length}
                      </span>

                      relationships

                    </div>

                  </div>

                </div>

                <div className="graph-instructions">
                  Scroll to zoom · Drag to move · Click a node
                </div>

              </div>

              <div className="graph-area">

                {loading ? (

                  <div className="graph-loading">
                    <div className="spinner"></div>
                    Loading intelligence network...
                  </div>

                ) : error ? (

                  <div className="graph-error">
                    {error}
                  </div>

                ) : graph.nodes.length === 0 ? (

                  <div className="graph-empty">
                    <div className="empty-icon">⌕</div>
                    <h3>No intelligence found</h3>
                    <p>
                      Try another search term or reset the filters.
                    </p>
                  </div>

                ) : (

                  <svg
                    ref={svgRef}
                    className="network-svg"
                  />

                )}

                <div className="graph-controls">

                  <button
                    onClick={() => {
                      const svg = d3.select(svgRef.current);

                      svg
                        .transition()
                        .duration(400)
                        .call(
                          d3.zoom().transform,
                          d3.zoomIdentity
                        );
                    }}
                  >
                    ⛶
                  </button>

                </div>

              </div>

              {/* LEGEND */}

              <div className="legend">

                <Legend
                  color={COLORS.ThreatActor}
                  label="Threat Actor"
                />

                <Legend
                  color={COLORS.Malware}
                  label="Malware"
                />

                <Legend
                  color={COLORS.Technique}
                  label="Technique"
                />

                <Legend
                  color={COLORS.Vulnerability}
                  label="Vulnerability"
                />

                <Legend
                  color={COLORS.Campaign}
                  label="Campaign"
                />

                <Legend
                  color={COLORS.Industry}
                  label="Industry"
                />

                <Legend
                  color={COLORS.Software}
                  label="Software"
                />

              </div>

            </div>

            {/* INSPECTOR */}

            <aside className="inspector-card">

              <div className="inspector-header">

                <div className="inspector-header-icon">
                  ⌘
                </div>

                <div>

                  <h2>
                    Intelligence Inspector
                  </h2>

                  <p>
                    Select a node to view details
                  </p>

                </div>

              </div>

              {!selectedNode ? (

                <div className="inspector-empty">

                  <div className="inspector-empty-icon">
                    ◇
                  </div>

                  <h3>
                    No node selected
                  </h3>

                  <p>
                    Click any entity in the graph to investigate it.
                  </p>

                </div>

              ) : (

                <div className="inspector-content">

                  <div
                    className="selected-node-icon"
                    style={{
                      background:
                        COLORS[selectedNode.type] ||
                        COLORS.Entity,
                    }}
                  >
                    ●
                  </div>

                  <h3 className="selected-node-name">
                    {selectedNode.label}
                  </h3>

                  <div
                    className="selected-node-type"
                    style={{
                      color:
                        COLORS[selectedNode.type] ||
                        COLORS.Entity,
                      background: `${COLORS[selectedNode.type] || COLORS.Entity}15`,
                    }}
                  >
                    {selectedNode.type}
                  </div>

                  <div className="inspector-section">

                    <div className="section-title">
                      KEY INFORMATION
                    </div>

                    <InfoRow
                      label="Name"
                      value={
                        selectedNode.details?.name ||
                        selectedNode.label
                      }
                    />

                    <InfoRow
                      label="Type"
                      value={selectedNode.type}
                    />

                    {Object.entries(
                      selectedNode.details || {}
                    )
                      .filter(([key]) => key !== "name")
                      .slice(0, 5)
                      .map(([key, value]) => (
                        <InfoRow
                          key={key}
                          label={key.replaceAll("_", " ")}
                          value={
                            Array.isArray(value)
                              ? value.join(", ")
                              : String(value)
                          }
                        />
                      ))}

                  </div>

                  <div className="inspector-section">

                    <div className="section-title">
                      NODE ID
                    </div>

                    <div className="node-id">
                      {selectedNode.id}
                    </div>

                  </div>

                </div>

              )}

            </aside>

          </section>

          {/* FOOTER */}

          <footer className="footer">

            <div>
              <strong>Cyber Threat Intelligence Graph</strong>
              <span> · MITRE ATT&CK Knowledge Platform</span>
            </div>

            <div>
              Neo4j + FastAPI + React + D3.js
            </div>

          </footer>

        </div>

      </main>

    </div>
  );
}

/* ================= COMPONENTS ================= */

function StatCard({
  icon,
  label,
  value,
  description,
  type,
}) {
  return (
    <div className="stat-card">

      <div className={`stat-icon ${type}`}>
        {icon}
      </div>

      <div className="stat-content">

        <div className="stat-label">
          {label}
        </div>

        <div className="stat-value">
          {value}
        </div>

        <div className="stat-description">
          {description}
        </div>

      </div>

    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div className="legend-item">

      <span
        className="legend-dot"
        style={{ background: color }}
      ></span>

      <span>{label}</span>

    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="info-row">

      <div className="info-label">
        {label}
      </div>

      <div className="info-value">
        {value}
      </div>

    </div>
  );
}

export default App;