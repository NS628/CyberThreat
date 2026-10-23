# Cyber Threat Intelligence Knowledge Graph

An interactive Cyber Threat Intelligence (CTI) platform powered by **FastAPI**, **Neo4j Graph Database**, and a modern **React + Vite** frontend with interactive **D3.js** network visualizations.

The platform models relations between Threat Actors (Groups), Techniques (MITRE ATT&CK), Software/Malware, Tactics, and Mitigations to provide actionable threat graph exploration and attack-path analytics.

---

## 🚀 Architecture

- **Backend**: Python, FastAPI, Neo4j Python Driver, NetworkX for graph path calculations, Uvicorn ASGI server.
- **Frontend**: React 18, Vite, D3.js (interactive force-directed graph), modern responsive CSS.
- **Database**: Neo4j Graph Database (nodes & relationships following the MITRE ATT&CK STIX 2.1 taxonomy).

---

## 🛠️ Project Structure

```text
CyberThreat/
├── backend/
│   ├── app/
│   │   ├── database.py       # Neo4j driver connection helper
│   │   ├── main.py           # FastAPI routes & graph queries
│   │   └── routes/           # Additional modular routes
│   ├── data/
│   │   └── import_mitre.py   # MITRE ATT&CK Enterprise STIX data ingestion
│   ├── .env.example          # Sample environment variables
│   └── requirements.txt      # Python dependencies
│
├── frontend/
│   ├── public/               # Static assets & icons
│   ├── src/
│   │   ├── App.jsx           # Main UI & D3 graph visualizer
│   │   ├── App.css           # Styling
│   │   ├── main.jsx          # Entry point
│   │   └── mockData.js       # Fallback / demo dataset
│   ├── package.json          # Node dependencies and scripts
│   └── vite.config.js        # Vite build configuration
│
├── .gitignore                # Git ignore rules for Python & Node
└── README.md
```

---

## ⚙️ Setup Instructions

### 1. Prerequisites
- **Python**: 3.10+
- **Node.js**: 18+ and npm
- **Neo4j Database**: Local Neo4j Desktop or Neo4j Community/Enterprise running on `bolt://127.0.0.1:7687`

---

### 2. Backend Setup

1. Open a terminal in the `backend/` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On Linux/macOS:
   source venv/bin/activate
   ```

3. Install required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   Copy `.env.example` to `.env` and fill in your Neo4j credentials:
   ```bash
   cp .env.example .env
   ```
   Edit `.env`:
   ```env
   NEO4J_URI=bolt://127.0.0.1:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your_password
   NEO4J_DATABASE=neo4j
   ```

5. *(Optional)* Ingest MITRE ATT&CK Data into Neo4j:
   ```bash
   python data/import_mitre.py
   ```

6. Start the FastAPI backend server:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   API Documentation will be available at: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 3. Frontend Setup

1. Open a new terminal in the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

4. Open the application in your browser:
   [http://localhost:5173](http://localhost:5173)

---

## 🔒 Security Note
Never commit `.env` or production credentials to source control. Ensure `.env` is listed in your `.gitignore` file.
