// Comprehensive realistic MITRE ATT&CK & Cyber Threat Intelligence dataset
// Ensures the application is 100% functional, responsive, and presentable out-of-the-box

export const DEFAULT_NODES = [
  // Threat Actors
  {
    id: "ta-1",
    label: "APT29 (Cozy Bear)",
    type: "ThreatActor",
    details: {
      origin: "Russia (SVR)",
      first_seen: "2008",
      motivation: "Espionage, Information Theft",
      target_sectors: "Government, Defense contractors, Think Tanks, Technology",
      aliases: "NOBELIUM, Midnight Blizzard, The Dukes, CozyDuke",
      sophistication: "Advanced / Nation-State",
      confidence: "High",
    },
  },
  {
    id: "ta-2",
    label: "APT28 (Fancy Bear)",
    type: "ThreatActor",
    details: {
      origin: "Russia (GRU)",
      first_seen: "2004",
      motivation: "Military intelligence, Political disruption",
      target_sectors: "Defense, NATO allies, Aerospace, Media",
      aliases: "Sednit, Sofacy, STRONTIUM, Forest Blizzard",
      sophistication: "Advanced / Military cyber warfare",
      confidence: "High",
    },
  },
  {
    id: "ta-3",
    label: "Lazarus Group",
    type: "ThreatActor",
    details: {
      origin: "North Korea (RGB)",
      first_seen: "2009",
      motivation: "Financial theft, Cryptocurrency, Retaliation",
      target_sectors: "FinTech, Crypto exchanges, Defense, Critical Infrastructure",
      aliases: "HIDDEN COBRA, Zinc, Diamond Sleet, Guardians of Peace",
      sophistication: "High / Broad spectrum",
      confidence: "High",
    },
  },
  {
    id: "ta-4",
    label: "Volt Typhoon",
    type: "ThreatActor",
    details: {
      origin: "China (State-sponsored)",
      first_seen: "2021",
      motivation: "Pre-positioning for critical infrastructure sabotage",
      target_sectors: "Communications, Energy, Transportation, Water, Maritime",
      aliases: "Bronze Silhouette, Vanguard Panda, Insidious Taurus",
      sophistication: "Stealth Living-off-the-Land (LotL)",
      confidence: "Very High",
    },
  },
  {
    id: "ta-5",
    label: "FIN7",
    type: "ThreatActor",
    details: {
      origin: "Eastern Europe",
      first_seen: "2015",
      motivation: "Organized Cybercrime, Financial Extortion",
      target_sectors: "Retail, Hospitality, Restaurant chains, Gambling",
      aliases: "Carbanak Group, Sangria Tempest, ELBRUS",
      sophistication: "Expert engineering and front companies",
      confidence: "High",
    },
  },
  {
    id: "ta-6",
    label: "Sandworm Team",
    type: "ThreatActor",
    details: {
      origin: "Russia (GRU Unit 74455)",
      first_seen: "2009",
      motivation: "Destructive operations, Grid attacks",
      target_sectors: "Energy grids, Government, Telecommunications, Logistics",
      aliases: "BlackEnergy, TeleBots, Seashell Blizzard, Voodoo Bear",
      sophistication: "Critical infrastructure disruption & wiper operations",
      confidence: "Very High",
    },
  },

  // Malware
  {
    id: "m-1",
    label: "Cobalt Strike",
    type: "Malware",
    details: {
      category: "Adversary Simulation / C2 Beacon",
      architecture: "x86, x64",
      platforms: "Windows, Linux",
      first_observed: "2012",
      capabilities: "In-memory execution, Malleable C2, Named Pipe tunneling",
    },
  },
  {
    id: "m-2",
    label: "Mimikatz",
    type: "Malware",
    details: {
      category: "Credential Dumper / Post-exploitation",
      platforms: "Windows (LSASS)",
      author: "Benjamin Delpy (gentilkiwi)",
      capabilities: "Pass-the-Hash, Kerberos Golden Ticket, DCSync extraction",
    },
  },
  {
    id: "m-3",
    label: "SUNBURST Backdoor",
    type: "Malware",
    details: {
      category: "Supply Chain Trojan",
      target_software: "SolarWinds Orion Platform",
      stealth: "Domain generation algorithm (DGA), Staged execution",
      observed_in: "SolarWinds Supply Chain Compromise (2020)",
    },
  },
  {
    id: "m-4",
    label: "HermeticWiper",
    type: "Malware",
    details: {
      category: "Destructive Wiper",
      platforms: "Windows",
      mechanism: "Corrupts Master Boot Record (MBR) and NTFS partitions",
      signed_by: "Hermetica Digital Ltd (Stolen certificate)",
    },
  },
  {
    id: "m-5",
    label: "BlackCat (ALPHV)",
    type: "Malware",
    details: {
      category: "Ransomware-as-a-Service (RaaS)",
      language: "Rust",
      encryption: "ChaCha20-Poly1305 + AES",
      features: "Cross-platform (Windows/Linux/VMware ESXi)",
    },
  },
  {
    id: "m-6",
    label: "CARBANAK",
    type: "Malware",
    details: {
      category: "Banking Trojan & Backdoor",
      platforms: "Windows",
      functionality: "Video capture, ATM dispenser control, Keylogging",
    },
  },

  // Techniques
  {
    id: "t-1",
    label: "T1190: Exploit Public-Facing Application",
    type: "Technique",
    details: {
      tactic: "Initial Access",
      mitre_id: "T1190",
      detection: "WAF logs, ingress telemetry, sudden child process from IIS/nginx",
      severity: "Critical",
    },
  },
  {
    id: "t-2",
    label: "T1059.001: PowerShell Execution",
    type: "Technique",
    details: {
      tactic: "Execution",
      mitre_id: "T1059.001",
      detection: "Script Block Logging (EID 4104), Process Command Line auditing",
      severity: "High",
    },
  },
  {
    id: "t-3",
    label: "T1003.001: LSASS Memory Dumping",
    type: "Technique",
    details: {
      tactic: "Credential Access",
      mitre_id: "T1003.001",
      detection: "Sysmon EID 10 (ProcessAccess to lsass.exe), LSA Protection",
      severity: "High",
    },
  },
  {
    id: "t-4",
    label: "T1078: Valid Accounts",
    type: "Technique",
    details: {
      tactic: "Defense Evasion, Persistence, Initial Access",
      mitre_id: "T1078",
      detection: "Anomalous MFA sign-in location, impossible travel",
      severity: "High",
    },
  },
  {
    id: "t-5",
    label: "T1195.002: Compromise Software Supply Chain",
    type: "Technique",
    details: {
      tactic: "Initial Access",
      mitre_id: "T1195.002",
      detection: "Software bill of materials (SBOM), binary signing integrity",
      severity: "Critical",
    },
  },
  {
    id: "t-6",
    label: "T1485: Data Destruction",
    type: "Technique",
    details: {
      tactic: "Impact",
      mitre_id: "T1485",
      detection: "Mass filesystem modifications, Raw disk handle open",
      severity: "Emergency",
    },
  },

  // Vulnerabilities
  {
    id: "v-1",
    label: "CVE-2023-38831",
    type: "Vulnerability",
    details: {
      cve_id: "CVE-2023-38831",
      cvss: 7.8,
      severity: "HIGH",
      component: "WinRAR code execution flaw",
      known_exploits: "Actively exploited in the wild by Russian state groups",
    },
  },
  {
    id: "v-2",
    label: "CVE-2021-44228 (Log4Shell)",
    type: "Vulnerability",
    details: {
      cve_id: "CVE-2021-44228",
      cvss: 10.0,
      severity: "CRITICAL",
      component: "Apache Log4j2 JNDI Remote Code Execution",
      status: "Ubiquitous vector, patched globally",
    },
  },
  {
    id: "v-3",
    label: "CVE-2023-2868",
    type: "Vulnerability",
    details: {
      cve_id: "CVE-2023-2868",
      cvss: 9.8,
      severity: "CRITICAL",
      component: "Barracuda Email Security Gateway (ESG) Tar file processing",
      status: "UNC4841 zero-day campaign",
    },
  },
  {
    id: "v-4",
    label: "CVE-2024-3400",
    type: "Vulnerability",
    details: {
      cve_id: "CVE-2024-3400",
      cvss: 10.0,
      severity: "CRITICAL",
      component: "Palo Alto PAN-OS GlobalProtect Command Injection",
      status: "Extensively exploited by state-sponsored actors",
    },
  },

  // Campaigns
  {
    id: "c-1",
    label: "Operation SolarWinds",
    type: "Campaign",
    details: {
      timeframe: "2020 - 2021",
      threat_actor: "APT29 (Midnight Blizzard)",
      impact: "18,000+ organizations trojanized globally",
      scope: "US Federal Government, Microsoft, FireEye",
    },
  },
  {
    id: "c-2",
    label: "Operation Ghostwriter",
    type: "Campaign",
    details: {
      timeframe: "2017 - Present",
      threat_actor: "UNC1151 / Ghostwriter",
      focus: "Disinformation targeting NATO presence in Eastern Europe",
      vector: "Compromised CMS and local journalist credentials",
    },
  },
  {
    id: "c-3",
    label: "Colonial Pipeline Attack",
    type: "Campaign",
    details: {
      timeframe: "May 2021",
      threat_actor: "DarkSide / Cybercrime Affiliate",
      impact: "Temporary shutdown of largest refined fuel pipeline in US",
      ransom_paid: "75 Bitcoin (largely recovered by DOJ)",
    },
  },

  // Industries
  {
    id: "ind-1",
    label: "Defense & Aerospace",
    type: "Industry",
    details: {
      risk_rating: "Critical",
      primary_threat: "Nation-state espionage & IP theft",
      compliance_req: "CMMC 2.0, NIST 800-171, ITAR",
    },
  },
  {
    id: "ind-2",
    label: "Energy & Utilities",
    type: "Industry",
    details: {
      risk_rating: "Critical",
      primary_threat: "SCADA / ICS disruption, Living-off-the-land",
      compliance_req: "NERC CIP, TSA Pipeline Security Directive",
    },
  },
  {
    id: "ind-3",
    label: "Financial Services",
    type: "Industry",
    details: {
      risk_rating: "High",
      primary_threat: "SWIFT fraud, Ransomware extortion, Ransomware DDoS",
      compliance_req: "PCI-DSS, DORA, NYDFS Part 500",
    },
  },
  {
    id: "ind-4",
    label: "Government & Diplomacy",
    type: "Industry",
    details: {
      risk_rating: "Critical",
      primary_threat: "Classified telemetry theft, Strategic diplomacy leaks",
      compliance_req: "FedRAMP, FISMA",
    },
  },
  {
    id: "ind-5",
    label: "Healthcare & Pharmaceuticals",
    type: "Industry",
    details: {
      risk_rating: "High",
      primary_threat: "Double extortion ransomware, clinical downtime",
      compliance_req: "HIPAA Security Rule, HITECH",
    },
  },

  // Software
  {
    id: "s-1",
    label: "SolarWinds Orion",
    type: "Software",
    details: {
      vendor: "SolarWinds Inc.",
      category: "Network Performance Monitoring",
      role: "Injected during build pipeline to distribute SUNBURST",
    },
  },
  {
    id: "s-2",
    label: "Active Directory / Entra ID",
    type: "Software",
    details: {
      vendor: "Microsoft",
      category: "Enterprise Identity & Access Management",
      role: "Targeted for privilege escalation and Kerberoasting",
    },
  },
];

export const DEFAULT_LINKS = [
  // APT29 links
  { source: "ta-1", target: "m-1", type: "USES" },
  { source: "ta-1", target: "m-3", type: "DEVELOPED" },
  { source: "ta-1", target: "t-4", type: "EXECUTES" },
  { source: "ta-1", target: "t-5", type: "EXECUTES" },
  { source: "ta-1", target: "c-1", type: "ATTRIBUTED_TO" },
  { source: "ta-1", target: "ind-4", type: "TARGETS" },
  { source: "ta-1", target: "ind-1", type: "TARGETS" },

  // APT28 links
  { source: "ta-2", target: "m-2", type: "USES" },
  { source: "ta-2", target: "v-1", type: "EXPLOITS" },
  { source: "ta-2", target: "t-2", type: "EXECUTES" },
  { source: "ta-2", target: "ind-1", type: "TARGETS" },
  { source: "ta-2", target: "ind-4", type: "TARGETS" },

  // Lazarus Group links
  { source: "ta-3", target: "m-1", type: "USES" },
  { source: "ta-3", target: "v-2", type: "EXPLOITS" },
  { source: "ta-3", target: "t-1", type: "EXECUTES" },
  { source: "ta-3", target: "ind-3", type: "TARGETS" },

  // Volt Typhoon links
  { source: "ta-4", target: "v-4", type: "EXPLOITS" },
  { source: "ta-4", target: "t-4", type: "EXECUTES" },
  { source: "ta-4", target: "ind-2", type: "TARGETS" },

  // FIN7 links
  { source: "ta-5", target: "m-6", type: "USES" },
  { source: "ta-5", target: "m-2", type: "USES" },
  { source: "ta-5", target: "ind-3", type: "TARGETS" },
  { source: "ta-5", target: "t-3", type: "EXECUTES" },

  // Sandworm links
  { source: "ta-6", target: "m-4", type: "DEPLOYED" },
  { source: "ta-6", target: "t-6", type: "EXECUTES" },
  { source: "ta-6", target: "ind-2", type: "TARGETS" },
  { source: "ta-6", target: "ind-1", type: "TARGETS" },

  // Software & Malware links
  { source: "m-3", target: "s-1", type: "INFECTED" },
  { source: "m-2", target: "s-2", type: "TARGETS" },
  { source: "c-1", target: "s-1", type: "LEVERAGED" },

  // Campaigns & Impacts
  { source: "c-3", target: "ind-2", type: "DISRUPTED" },
  { source: "c-3", target: "m-5", type: "DEPLOYED" },
];

export const DEFAULT_TIMELINE = [
  {
    id: "tl-1",
    date: "2024 - Q2",
    title: "Critical Ingress Exploitation via PAN-OS Zero-Day",
    actor: "Volt Typhoon",
    type: "Zero-Day Ingress",
    badge: "Exploit",
    summary:
      "Telemetry detected widespread probing of CVE-2024-3400 against critical infrastructure energy grids and telecommunication relays.",
    mitre: "T1190 • Exploit Public-Facing Application",
    severity: "Critical",
  },
  {
    id: "tl-2",
    date: "2023 - Q3",
    title: "Campaign Against European Defense Entities",
    actor: "APT28 (Fancy Bear)",
    type: "Phishing & CVE Execution",
    badge: "Espionage",
    summary:
      "Targeted spear-phishing distributing crafted archives exploiting CVE-2023-38831 to bypass endpoint protection and drop customized loaders.",
    mitre: "T1204 • User Execution",
    severity: "High",
  },
  {
    id: "tl-3",
    date: "2023 - Q1",
    title: "Barracuda Email Security Gateway Zero-Day Campaign",
    actor: "UNC4841 / State Nexus",
    type: "Appliance Compromise",
    badge: "Exfiltration",
    summary:
      "Persistent exfiltration of high-level diplomatic email correspondence through backdoor modules disguised as regular kernel updates.",
    mitre: "T1505.003 • Web Shell",
    severity: "Critical",
  },
  {
    id: "tl-4",
    date: "2022 - Q1",
    title: "HermeticWiper Deployed in Destructive Strikes",
    actor: "Sandworm Team",
    type: "Destructive Wiper",
    badge: "Sabotage",
    summary:
      "Coordinated cyberattacks deploying HermeticWiper and IsaacWiper across hundred of endpoints, corrupting master partition tables.",
    mitre: "T1485 • Data Destruction",
    severity: "Emergency",
  },
  {
    id: "tl-5",
    date: "2021 - Q2",
    title: "Colonial Pipeline Critical Ransomware Incident",
    actor: "DarkSide / Cybercrime Syndicate",
    type: "Ransomware Extortion",
    badge: "Ransomware",
    summary:
      "Compromised legacy VPN credentials without multi-factor authentication allowed threat actors to establish footholds, leading to proactive pipeline shutdown.",
    mitre: "T1078 • Valid Accounts",
    severity: "High",
  },
  {
    id: "tl-6",
    date: "2020 - Q4",
    title: "Discovery of SolarWinds Global Supply Chain Compromise",
    actor: "APT29 (Midnight Blizzard)",
    type: "Supply Chain Injection",
    badge: "Supply Chain",
    summary:
      "A digitally signed update to SolarWinds Orion contained malicious SUNBURST code, giving attackers persistent stealth access to tier-1 government and tech enterprises.",
    mitre: "T1195.002 • Supply Chain Compromise",
    severity: "Critical",
  },
];

export const DEFAULT_REPORTS = [
  {
    id: "rep-1",
    code: "CTI-2024-R04",
    title: "State-Sponsored Pre-Positioning in Critical Infrastructure",
    date: "October 2024",
    classification: "TLP:CLEAR",
    status: "Published",
    author: "Global Threat Intel Team",
    confidence: "High",
    summary:
      "In-depth analysis of living-off-the-land (LotL) tactics employed by Volt Typhoon, focusing on defensive evasion without custom binaries.",
    keyTakeaway:
      "Organizations must implement aggressive behavioral baselines on administrative utilities like netsh, wmic, and certutil.",
    tags: ["Critical Infrastructure", "Volt Typhoon", "LotL", "NERC CIP"],
  },
  {
    id: "rep-2",
    code: "CTI-2024-R03",
    title: "The Evolution of Ransomware Extortion: Rust & Multi-Extortion Models",
    date: "August 2024",
    classification: "TLP:CLEAR",
    status: "Published",
    author: "Cybercrime Research Unit",
    confidence: "High",
    summary:
      "Comprehensive breakdown of BlackCat (ALPHV) and successor syndicates adopting memory-safe languages and triple-extortion tactics.",
    keyTakeaway:
      "Offline and immutable backups coupled with automated credential rotation provide the highest resilience against modern extortion rings.",
    tags: ["Ransomware", "ALPHV", "Rust", "Defense-in-Depth"],
  },
  {
    id: "rep-3",
    code: "CTI-2024-R02",
    title: "Active Directory Identity Vulnerabilities & Golden Ticket Defense",
    date: "May 2024",
    classification: "TLP:AMBER+STRICT",
    status: "Verified",
    author: "Identity Security Practice",
    confidence: "Very High",
    summary:
      "Dissecting Mimikatz and DCSync telemetry across enterprise active directory environments, highlighting common misconfigurations.",
    keyTakeaway:
      "Tiered administration models and periodic KRBTGT password rotation severely limit credential replay blast radius.",
    tags: ["Active Directory", "Mimikatz", "Kerberos", "Identity"],
  },
  {
    id: "rep-4",
    code: "CTI-2024-R01",
    title: "SolarWinds / SUNBURST Retrospective & Supply Chain Security Hardening",
    date: "January 2024",
    classification: "TLP:CLEAR",
    status: "Published",
    author: "National Cyber Defense Lab",
    confidence: "High",
    summary:
      "Post-incident analysis of APT29 build-system injection mechanisms, evaluating software provenance and SBOM adoption across defense contractors.",
    keyTakeaway:
      "Build pipeline isolation and multi-party cryptographic verification are vital to preventing upstream artifact tampering.",
    tags: ["Supply Chain", "APT29", "SUNBURST", "SBOM"],
  },
];
