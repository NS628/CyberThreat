from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.database import get_db


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Cyber Threat Intelligence Graph API",
    description="Backend API for the Cyber Threat Intelligence Graph",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "message": "Cyber Threat Intelligence Graph API",
        "status": "running"
    }


# ============================================================
# GRAPH API
# ============================================================

@app.get("/api/graph")
def get_graph(
    search: str = "",
    node_type: str = "All",
    limit: int = 250,
    db=Depends(get_db)
):
    try:
        # Keep the maximum response size controlled.
        limit = min(max(limit, 1), 1000)

        # ----------------------------------------------------
        # Build node query
        # ----------------------------------------------------

        conditions = []
        parameters = {
            "limit": limit
        }

        if search.strip():
            conditions.append(
                """
                (
                    toLower(coalesce(n.name, "")) CONTAINS
                    toLower($search)
                    OR
                    toLower(coalesce(n.cve, "")) CONTAINS
                    toLower($search)
                    OR
                    toLower(coalesce(n.stix_id, "")) CONTAINS
                    toLower($search)
                )
                """
            )

            parameters["search"] = search.strip()

        if node_type != "All":
            conditions.append(
                "$node_type IN labels(n)"
            )

            parameters["node_type"] = node_type

        where_clause = ""

        if conditions:
            where_clause = (
                "WHERE " +
                " AND ".join(conditions)
            )

        node_query = f"""
        MATCH (n)
        {where_clause}
        RETURN
            toString(id(n)) AS id,
            coalesce(
                n.name,
                n.cve,
                n.stix_id,
                "Unknown"
            ) AS label,
            coalesce(
                labels(n)[0],
                "Entity"
            ) AS type,
            properties(n) AS details
        LIMIT $limit
        """

        node_records = list(
            db.run(
                node_query,
                **parameters
            )
        )

        # ----------------------------------------------------
        # Convert nodes
        # ----------------------------------------------------

        nodes = [
            {
                "id": record["id"],
                "label": record["label"],
                "type": record["type"],
                "details": record["details"]
            }
            for record in node_records
        ]

        node_ids = [
            node["id"]
            for node in nodes
        ]

        # ----------------------------------------------------
        # Relationships
        # ----------------------------------------------------

        if node_ids:

            relationship_query = """
            MATCH (a)-[r]->(b)
            WHERE
                toString(id(a)) IN $node_ids
                AND
                toString(id(b)) IN $node_ids
            RETURN
                toString(id(a)) AS source,
                toString(id(b)) AS target,
                type(r) AS type
            """

            relationship_records = list(
                db.run(
                    relationship_query,
                    node_ids=node_ids
                )
            )

            links = [
                {
                    "source": record["source"],
                    "target": record["target"],
                    "type": record["type"]
                }
                for record in relationship_records
            ]

        else:
            links = []

        return {
            "nodes": nodes,
            "links": links,
            "meta": {
                "search": search,
                "node_type": node_type,
                "limit": limit,
                "nodes_returned": len(nodes),
                "relationships_returned": len(links)
            }
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# STATISTICS API
# ============================================================

@app.get("/api/stats")
def get_stats(db=Depends(get_db)):
    try:

        # ----------------------------------------------------
        # Total nodes
        # ----------------------------------------------------

        node_count_result = db.run(
            """
            MATCH (n)
            RETURN count(n) AS total_nodes
            """
        ).single()

        total_nodes = (
            node_count_result["total_nodes"]
            if node_count_result
            else 0
        )

        # ----------------------------------------------------
        # Total relationships
        # ----------------------------------------------------

        relationship_count_result = db.run(
            """
            MATCH ()-[r]->()
            RETURN count(r) AS total_relationships
            """
        ).single()

        total_relationships = (
            relationship_count_result[
                "total_relationships"
            ]
            if relationship_count_result
            else 0
        )

        # ----------------------------------------------------
        # Node types
        # ----------------------------------------------------

        node_type_records = db.run(
            """
            MATCH (n)
            UNWIND labels(n) AS label
            RETURN
                label,
                count(*) AS count
            ORDER BY count DESC
            """
        )

        node_types = {
            record["label"]: record["count"]
            for record in node_type_records
        }

        # ----------------------------------------------------
        # Relationship types
        # ----------------------------------------------------

        relationship_type_records = db.run(
            """
            MATCH ()-[r]->()
            RETURN
                type(r) AS type,
                count(*) AS count
            ORDER BY count DESC
            """
        )

        relationship_types = {
            record["type"]: record["count"]
            for record in relationship_type_records
        }

        return {
            "total_nodes": total_nodes,
            "total_relationships": total_relationships,
            "node_types": node_types,
            "relationship_types": relationship_types
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# THREAT ACTOR INVESTIGATION
# ============================================================

@app.get("/api/investigate/{actor_name}")
def investigate_threat_actor(
    actor_name: str,
    db=Depends(get_db)
):
    try:

        # ----------------------------------------------------
        # Find the threat actor
        # ----------------------------------------------------

        actor_check = db.run(
            """
            MATCH (actor:ThreatActor)
            WHERE
                toLower(actor.name)
                =
                toLower($actor_name)
            RETURN actor.name AS actor_name
            """,
            actor_name=actor_name
        ).single()

        if not actor_check:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Threat actor "
                    f"'{actor_name}' "
                    f"was not found."
                )
            )

        # ----------------------------------------------------
        # Get connected intelligence
        # Up to two relationship hops away
        # ----------------------------------------------------

        query = """
        MATCH (actor:ThreatActor)
        WHERE
            toLower(actor.name)
            =
            toLower($actor_name)

        MATCH path =
            (actor)-[*1..2]-(connected)

        WITH
            collect(path) AS paths

        UNWIND paths AS path

        WITH
            nodes(path) AS path_nodes,
            relationships(path)
            AS path_relationships

        UNWIND path_nodes AS n

        WITH
            collect(
                DISTINCT {
                    id:
                        toString(id(n)),

                    label:
                        coalesce(
                            n.name,
                            n.cve,
                            n.stix_id,
                            "Unknown"
                        ),

                    type:
                        coalesce(
                            labels(n)[0],
                            "Entity"
                        ),

                    details:
                        properties(n)
                }
            ) AS node_list,

            collect(
                DISTINCT path_relationships
            ) AS relationship_lists

        UNWIND relationship_lists AS rel_list

        UNWIND rel_list AS r

        WITH
            node_list,

            collect(
                DISTINCT {
                    source:
                        toString(
                            id(startNode(r))
                        ),

                    target:
                        toString(
                            id(endNode(r))
                        ),

                    type:
                        type(r)
                }
            ) AS link_list

        RETURN
            node_list,
            link_list
        """

        result = db.run(
            query,
            actor_name=actor_name
        ).single()

        if not result:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"No intelligence "
                    f"connections found for "
                    f"'{actor_name}'."
                )
            )

        return {
            "actor": actor_check["actor_name"],
            "nodes": result["node_list"],
            "links": result["link_list"]
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# ANALYTICS API
# ============================================================

@app.get("/api/analytics")
def get_analytics(db=Depends(get_db)):
    try:

        # ----------------------------------------------------
        # Entity distribution
        # ----------------------------------------------------

        node_query = """
        MATCH (n)
        UNWIND labels(n) AS label
        RETURN
            label,
            count(*) AS count
        ORDER BY count DESC
        """

        node_result = db.run(node_query)

        node_distribution = [
            {
                "type": record["label"],
                "count": record["count"]
            }
            for record in node_result
        ]

        # ----------------------------------------------------
        # Relationship distribution
        # ----------------------------------------------------

        relationship_query = """
        MATCH ()-[r]->()
        RETURN
            type(r) AS relationship,
            count(*) AS count
        ORDER BY count DESC
        """

        relationship_result = db.run(
            relationship_query
        )

        relationship_distribution = [
            {
                "type": record["relationship"],
                "count": record["count"]
            }
            for record in relationship_result
        ]

        # ----------------------------------------------------
        # Most connected entities
        # ----------------------------------------------------

        central_entities_query = """
        MATCH (n)
        OPTIONAL MATCH (n)-[r]-()
        WITH
            n,
            count(r) AS connections

        RETURN
            coalesce(
                n.name,
                n.cve,
                n.stix_id,
                "Unknown"
            ) AS name,

            coalesce(
                labels(n)[0],
                "Entity"
            ) AS type,

            connections

        ORDER BY connections DESC

        LIMIT 10
        """

        central_entities_result = db.run(
            central_entities_query
        )

        central_entities = [
            {
                "name": record["name"],
                "type": record["type"],
                "connections": record["connections"]
            }
            for record in central_entities_result
        ]

        return {
            "node_distribution":
                node_distribution,

            "relationship_distribution":
                relationship_distribution,

            "central_entities":
                central_entities
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )