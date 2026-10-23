import os
import requests
from neo4j import GraphDatabase
from dotenv import load_dotenv

# ============================================================
# CONFIGURATION
# ============================================================

load_dotenv()

NEO4J_URI = os.getenv(
    "NEO4J_URI",
    "bolt://127.0.0.1:7687"
)

NEO4J_USER = os.getenv(
    "NEO4J_USER",
    "neo4j"
)

NEO4J_PASSWORD = os.getenv(
    "NEO4J_PASSWORD"
)

NEO4J_DATABASE = os.getenv(
    "NEO4J_DATABASE",
    "neo4j"
)

MITRE_URL = (
    "https://raw.githubusercontent.com/"
    "mitre-attack/attack-stix-data/master/"
    "enterprise-attack/enterprise-attack.json"
)


# ============================================================
# DOWNLOAD MITRE ATT&CK DATA
# ============================================================

def download_mitre_data():
    print()
    print("=" * 60)
    print("DOWNLOADING MITRE ATT&CK ENTERPRISE DATA")
    print("=" * 60)

    response = requests.get(
        MITRE_URL,
        timeout=120
    )

    response.raise_for_status()

    data = response.json()

    print(
        f"Downloaded {len(data['objects'])} STIX objects."
    )

    return data["objects"]


# ============================================================
# CREATE NEO4J DRIVER
# ============================================================

driver = GraphDatabase.driver(
    NEO4J_URI,
    auth=(
        NEO4J_USER,
        NEO4J_PASSWORD
    )
)


# ============================================================
# CLEAR EXISTING DEMO GRAPH
# ============================================================

def clear_database(tx):
    tx.run(
        """
        MATCH (n)
        DETACH DELETE n
        """
    )


# ============================================================
# CREATE NODE
# ============================================================

def create_node(tx, label, properties):
    query = f"""
    MERGE (n:{label} {{stix_id: $stix_id}})
    SET n += $properties
    """

    tx.run(
        query,
        stix_id=properties["stix_id"],
        properties=properties
    )


# ============================================================
# CREATE RELATIONSHIP
# ============================================================

def create_relationship(
    tx,
    source_id,
    target_id,
    relationship_type,
    properties=None
):

    if properties is None:
        properties = {}

    query = f"""
    MATCH (a {{stix_id: $source_id}})
    MATCH (b {{stix_id: $target_id}})
    MERGE (a)-[r:{relationship_type}]->(b)
    SET r += $properties
    """

    tx.run(
        query,
        source_id=source_id,
        target_id=target_id,
        properties=properties
    )


# ============================================================
# IMPORT DATA
# ============================================================

def import_data(objects):

    node_objects = {}

    relationship_objects = []

    # --------------------------------------------------------
    # FIRST PASS
    # Identify useful ATT&CK objects
    # --------------------------------------------------------

    for obj in objects:

        object_type = obj.get("type")

        object_id = obj.get("id")

        if not object_id:
            continue

        # Ignore revoked/deprecated objects
        if obj.get("revoked", False):
            continue

        if obj.get("x_mitre_deprecated", False):
            continue

        # ----------------------------------------------------
        # THREAT ACTORS
        # ----------------------------------------------------

        if object_type == "intrusion-set":

            node_objects[object_id] = (
                "ThreatActor",
                {
                    "stix_id": object_id,
                    "name": obj.get(
                        "name",
                        "Unknown"
                    ),
                    "description": obj.get(
                        "description",
                        ""
                    ),
                    "created": obj.get(
                        "created",
                        ""
                    ),
                    "modified": obj.get(
                        "modified",
                        ""
                    ),
                    "source": "MITRE ATT&CK"
                }
            )

        # ----------------------------------------------------
        # MALWARE
        # ----------------------------------------------------

        elif object_type == "malware":

            node_objects[object_id] = (
                "Malware",
                {
                    "stix_id": object_id,
                    "name": obj.get(
                        "name",
                        "Unknown"
                    ),
                    "description": obj.get(
                        "description",
                        ""
                    ),
                    "created": obj.get(
                        "created",
                        ""
                    ),
                    "modified": obj.get(
                        "modified",
                        ""
                    ),
                    "source": "MITRE ATT&CK"
                }
            )

        # ----------------------------------------------------
        # TECHNIQUES
        # ----------------------------------------------------

        elif object_type == "attack-pattern":

            node_objects[object_id] = (
                "Technique",
                {
                    "stix_id": object_id,
                    "name": obj.get(
                        "name",
                        "Unknown"
                    ),
                    "description": obj.get(
                        "description",
                        ""
                    ),
                    "created": obj.get(
                        "created",
                        ""
                    ),
                    "modified": obj.get(
                        "modified",
                        ""
                    ),
                    "source": "MITRE ATT&CK"
                }
            )

        # ----------------------------------------------------
        # CAMPAIGNS
        # ----------------------------------------------------

        elif object_type == "campaign":

            node_objects[object_id] = (
                "Campaign",
                {
                    "stix_id": object_id,
                    "name": obj.get(
                        "name",
                        "Unknown"
                    ),
                    "description": obj.get(
                        "description",
                        ""
                    ),
                    "created": obj.get(
                        "created",
                        ""
                    ),
                    "modified": obj.get(
                        "modified",
                        ""
                    ),
                    "source": "MITRE ATT&CK"
                }
            )

        # ----------------------------------------------------
        # RELATIONSHIPS
        # ----------------------------------------------------

        elif object_type == "relationship":

            relationship_objects.append(obj)

    # --------------------------------------------------------
    # WRITE NODES
    # --------------------------------------------------------

    print()
    print("=" * 60)
    print("IMPORTING NODES")
    print("=" * 60)

    with driver.session(
        database=NEO4J_DATABASE
    ) as session:

        for index, (
            object_id,
            (label, properties)
        ) in enumerate(
            node_objects.items(),
            start=1
        ):

            session.execute_write(
                create_node,
                label,
                properties
            )

            if index % 100 == 0:
                print(
                    f"Imported {index} nodes..."
                )

    print(
        f"Total nodes imported: "
        f"{len(node_objects)}"
    )

    # --------------------------------------------------------
    # WRITE RELATIONSHIPS
    # --------------------------------------------------------

    print()
    print("=" * 60)
    print("IMPORTING RELATIONSHIPS")
    print("=" * 60)

    relationship_count = 0

    with driver.session(
        database=NEO4J_DATABASE
    ) as session:

        for relationship in relationship_objects:

            source_ref = relationship.get(
                "source_ref"
            )

            target_ref = relationship.get(
                "target_ref"
            )

            relationship_type = relationship.get(
                "relationship_type"
            )

            # Only create relationships between
            # nodes that we imported.
            if (
                source_ref not in node_objects
                or
                target_ref not in node_objects
            ):
                continue

            # ------------------------------------------------
            # Convert STIX relationship names
            # into Neo4j relationship names.
            # ------------------------------------------------

            if relationship_type == "uses":

                rel_type = "USES"

            elif relationship_type == "targets":

                rel_type = "TARGETS"

            elif relationship_type == "attributed-to":

                rel_type = "ATTRIBUTED_TO"

            elif relationship_type == "compromises":

                rel_type = "COMPROMISES"

            elif relationship_type == "delivers":

                rel_type = "DELIVERS"

            elif relationship_type == "downloads":

                rel_type = "DOWNLOADS"

            elif relationship_type == "exploits":

                rel_type = "EXPLOITS"

            else:

                rel_type = "RELATED_TO"

            properties = {
                "source": "MITRE ATT&CK"
            }

            session.execute_write(
                create_relationship,
                source_ref,
                target_ref,
                rel_type,
                properties
            )

            relationship_count += 1

            if relationship_count % 100 == 0:
                print(
                    f"Imported "
                    f"{relationship_count} relationships..."
                )

    print(
        f"Total relationships imported: "
        f"{relationship_count}"
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 60)
    print("CYBER THREAT INTELLIGENCE GRAPH")
    print("MITRE ATT&CK IMPORTER")
    print("=" * 60)

    try:

        # ----------------------------------------------------
        # Test Neo4j connection
        # ----------------------------------------------------

        print()
        print("Checking Neo4j connection...")

        driver.verify_connectivity()

        print("Neo4j connection successful.")

        # ----------------------------------------------------
        # Download data
        # ----------------------------------------------------

        objects = download_mitre_data()

        # ----------------------------------------------------
        # WARNING
        # ----------------------------------------------------

        print()
        print("=" * 60)
        print("WARNING")
        print("=" * 60)
        print(
            "The existing demo graph will be replaced "
            "with MITRE ATT&CK data."
        )

        answer = input(
            "Continue? Type YES to continue: "
        )

        if answer != "YES":

            print()
            print("Import cancelled.")

            return

        # ----------------------------------------------------
        # Clear old graph
        # ----------------------------------------------------

        print()
        print("Clearing existing demo graph...")

        with driver.session(
            database=NEO4J_DATABASE
        ) as session:

            session.execute_write(
                clear_database
            )

        print("Old graph cleared.")

        # ----------------------------------------------------
        # Import
        # ----------------------------------------------------

        import_data(objects)

        # ----------------------------------------------------
        # Final statistics
        # ----------------------------------------------------

        print()
        print("=" * 60)
        print("IMPORT COMPLETE")
        print("=" * 60)

        with driver.session(
            database=NEO4J_DATABASE
        ) as session:

            node_result = session.run(
                "MATCH (n) RETURN count(n) AS count"
            )

            relationship_result = session.run(
                "MATCH ()-[r]->() "
                "RETURN count(r) AS count"
            )

            node_count = node_result.single()["count"]

            relationship_count = (
                relationship_result
                .single()["count"]
            )

        print(
            f"Nodes in Neo4j: "
            f"{node_count}"
        )

        print(
            f"Relationships in Neo4j: "
            f"{relationship_count}"
        )

        print()
        print(
            "MITRE ATT&CK data is now "
            "available in your CTI graph."
        )

    except Exception as error:

        print()
        print("=" * 60)
        print("IMPORT FAILED")
        print("=" * 60)

        print(error)

    finally:

        driver.close()


if __name__ == "__main__":
    main()