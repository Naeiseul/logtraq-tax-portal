// LogTraq Finance Operations Application Logic

const journeySteps = [
  "Intake",
  "Documents",
  "Practitioner review",
  "Ready to submit",
  "Submitted",
  "SARS verification",
  "Complete",
];

const requiredDocs = [
  "ID document",
  "IRP5 / IT3(a)",
  "Medical aid certificate",
  "Retirement annuity certificate",
  "Travel logbook",
  "Donation certificate",
  "Other supporting documents",
];

// Mock Client Data - Focus entirely on Finance/Tax Obligations
const clients = [
  {
    name: "A. Mokoena",
    email: "amokoena@example.com",
    phone: "+27 72 000 0001",
    status: 2, // Practitioner review
    income: "IRP5 received",
    missing: ["Medical aid certificate", "Travel logbook"],
    uploaded: ["ID document", "IRP5 / IT3(a)"],
    updated: "Today, 08:14",
  },
  {
    name: "L. Naidoo",
    email: "lnaidoo@example.com",
    phone: "+27 73 000 0002",
    status: 3, // Ready to submit
    income: "Ready with deductions",
    missing: [],
    uploaded: [
      "ID document",
      "IRP5 / IT3(a)",
      "Medical aid certificate",
      "Retirement annuity certificate",
      "Travel logbook",
      "Donation certificate",
      "Other supporting documents",
    ],
    updated: "Yesterday, 17:42",
  },
  {
    name: "T. Dlamini",
    email: "tdlamini@example.com",
    phone: "+27 74 000 0003",
    status: 1, // Documents pending
    income: "Awaiting first upload",
    missing: ["ID document", "IRP5 / IT3(a)", "Medical aid certificate"],
    uploaded: [],
    updated: "Yesterday, 10:05",
  },
];

const config = {
  salesWhatsApp: "27793257256",
  ...(window.LOGTRAQ_CONFIG || {}),
};

let selectedClientIndex = 0;
let clientMode = false; // Toggle between Practice view and Client view

// Helper to generate WhatsApp links
function getWhatsAppLink(messageText) {
  const cleanPhone = config.salesWhatsApp.replace(/[^0-9]/g, "");
  const encodedText = encodeURIComponent(messageText);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

// Element creation helper
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function progressPercent(status) {
  return Math.round((status / (journeySteps.length - 1)) * 100);
}

function statusLabel(status) {
  return journeySteps[status] || journeySteps[0];
}

// Render progress timeline bar
function renderJourney(status, compact = false) {
  const wrap = el("div", compact ? "journey compact" : "journey");
  const line = el("div", "journey-line");
  const fill = el("div", "journey-fill");
  fill.style.width = `${progressPercent(status)}%`;
  line.appendChild(fill);
  wrap.appendChild(line);

  journeySteps.forEach((step, index) => {
    const point = el("div", "journey-point");
    point.style.left = `${(index / (journeySteps.length - 1)) * 100}%`;
    const dot = el("span", index <= status ? "dot done" : "dot");
    const label = el("strong", "", step);
    const small = el("small", "", index < status ? "Done" : index === status ? "Current" : "Pending");
    
    if (index === status) {
      point.classList.add("active");
    }
    
    point.append(dot, label, small);
    wrap.appendChild(point);
  });

  return wrap;
}

// Render list of clients for the dashboard sidebar
function renderClientList() {
  const list = el("div", "client-list");
  clients.forEach((client, index) => {
    const item = el("button", index === selectedClientIndex ? "client-row active" : "client-row");
    item.innerHTML = `
      <span>
        <strong>${client.name}</strong>
        <small>${client.email}</small>
      </span>
      <em>${statusLabel(client.status)}</em>
    `;
    item.addEventListener("click", () => {
      selectedClientIndex = index;
      renderPortal();
    });
    list.appendChild(item);
  });
  return list;
}

// Render document slots (can be clicked to toggle mock upload)
function renderDocuments(client) {
  const wrap = el("div", "doc-grid");
  requiredDocs.forEach((doc) => {
    const uploaded = client.uploaded.includes(doc);
    const item = el("div", uploaded ? "doc-slot uploaded" : "doc-slot");
    item.innerHTML = `
      <strong>${doc}</strong>
      <small>${uploaded ? "Uploaded &amp; Locked" : "Click to simulate upload"}</small>
    `;
    
    item.addEventListener("click", () => {
      if (uploaded) {
        // Toggle off (remove document)
        client.uploaded = client.uploaded.filter(d => d !== doc);
        if (!client.missing.includes(doc)) {
          client.missing.push(doc);
        }
      } else {
        // Toggle on (upload document)
        client.uploaded.push(doc);
        client.missing = client.missing.filter(d => d !== doc);
      }
      
      // Recalculate status based on uploaded documents count
      const uploadRatio = client.uploaded.length / requiredDocs.length;
      if (uploadRatio === 0) {
        client.status = 0; // Intake
      } else if (uploadRatio < 0.5) {
        client.status = 1; // Documents
      } else if (uploadRatio < 1.0) {
        client.status = 2; // Practitioner review
      } else {
        client.status = 3; // Ready to submit
      }
      
      client.updated = "Just now (simulated)";
      renderPortal();
    });
    
    wrap.appendChild(item);
  });
  return wrap;
}

// Renders the interactive mockup portal inside #portal-page
function renderPortal() {
  const portalPage = document.querySelector("#portal-page");
  if (!portalPage) return;
  
  const client = clients[selectedClientIndex];
  
  // Calculate dynamic metrics
  const totalClients = clients.length;
  const readyToFile = clients.filter(c => c.uploaded.length === requiredDocs.length).length;
  const missingDocsCount = clients.reduce((acc, c) => acc + c.missing.length, 0);

  const shell = el("div", "portal-shell");

  // Sidebar
  const sidebar = el("aside", "sidebar");
  sidebar.innerHTML = `
    <a class="brand portal-brand" href="#">
      <span class="brand-mark">LQ</span>
      <span>LogTraq Hub</span>
    </a>
    <button class="side-link active">Obligations Workspace</button>
    <button class="side-link">Clients (Practices)</button>
    <button class="side-link">Evidence Bundles</button>
    <button class="side-link">Security Settings</button>
    <button class="side-link muted" id="backToLandingBtn">← Return to Landing Page</button>
  `;

  // Portal Content Main Section
  const content = el("section", "portal-content");
  
  // Header with toggle
  const header = el("header", "portal-header");
  header.innerHTML = `
    <div>
      <p class="eyebrow">Interactive Mockup Workspace</p>
      <h1>${clientMode ? "Branded Client View" : "Practitioner cockpit"}</h1>
    </div>
    <div class="toggle-group" role="group" aria-label="View mode">
      <button class="${clientMode ? "" : "active"}" id="switchToPractice">Practice Admin</button>
      <button class="${clientMode ? "active" : ""}" id="switchToClient">Client Portal</button>
    </div>
  `;

  // Metric Cards
  const metrics = el("section", "metrics");
  metrics.append(
    metric("Active clients", totalClients.toString(), "In progress tax season queue"),
    metric("Ready to file", readyToFile.toString(), "All required files collected"),
    metric("Pending files", missingDocsCount.toString(), "Client uploads remaining")
  );

  // Split View / Body
  if (clientMode) {
    // Client portal perspective
    const clientView = el("section", "client-view");
    clientView.innerHTML = `
      <div class="client-hero">
        <p class="eyebrow">Client Workspace for ${client.name}</p>
        <h2>Status of Tax Return: ${statusLabel(client.status)}</h2>
        <p>Your practitioner has requested the files listed below. Click on any slot to simulate uploading that document. Files marked in green are verified and locked.</p>
      </div>
    `;
    
    clientView.append(renderJourney(client.status), renderDocuments(client));
    content.append(header, clientView);
  } else {
    // Practitioner cockpit perspective
    const workspace = el("section", "workspace-grid");
    
    // Left: Client list panel
    const leftPanel = el("div", "panel");
    leftPanel.innerHTML = `
      <div class="panel-head">
        <div>
          <p class="eyebrow">South Africa Tax Queue</p>
          <h2> FTR / ITR12 Queue</h2>
        </div>
      </div>
    `;
    leftPanel.appendChild(renderClientList());

    // Right: Selected Client detailed workflow
    const rightPanel = el("div", "panel client-detail");
    rightPanel.innerHTML = `
      <div class="panel-head">
        <div>
          <p class="eyebrow">Practitioner Review Action</p>
          <h2>${client.name}</h2>
          <p>${client.income} • Last updated: ${client.updated}</p>
        </div>
        <span class="status-pill">${statusLabel(client.status)}</span>
      </div>
    `;
    
    // Append compact journey and lists
    rightPanel.append(renderJourney(client.status, true));
    
    // Exception / missing info box
    const missingBox = el("div", "missing-box");
    missingBox.innerHTML = `
      <div>
        <h3>${client.missing.length ? "Missing Evidence" : "Filing Ready"}</h3>
        <p>${client.missing.length ? client.missing.join(", ") : "All required client documents are successfully uploaded &amp; reviewed."}</p>
      </div>
      <a class="secondary-button" href="https://wa.me/${client.phone.replace(/[^0-9]/g, "")}?text=Hi%20${encodeURIComponent(client.name)}%2C%20please%20upload%20your%20remaining%20tax%20documents%20to%20your%20LogTraq%20portal." target="_blank" rel="noreferrer">WhatsApp follow-up</a>
    `;
    
    rightPanel.append(missingBox, renderDocuments(client));
    workspace.append(leftPanel, rightPanel);
    content.append(header, metrics, workspace);
  }

  shell.append(sidebar, content);
  
  // Replace portal-page children and bind events
  portalPage.replaceChildren(shell);
  
  // Event Bindings
  document.querySelector("#backToLandingBtn").addEventListener("click", () => {
    document.body.classList.remove("portal-active");
  });
  
  document.querySelector("#switchToPractice").addEventListener("click", () => {
    clientMode = false;
    renderPortal();
  });
  
  document.querySelector("#switchToClient").addEventListener("click", () => {
    clientMode = true;
    renderPortal();
  });
}

// Single metric card generator
function metric(label, value, detail) {
  const node = el("article", "metric-card");
  node.innerHTML = `<span>${label}</span><strong>${value}</strong><small>${detail}</small>`;
  return node;
}

// Setup links and dynamic listeners on landing page load
function initializeLandingPage() {
  const walkthroughMsg = "Hi LogTraq, I would like to request a practice walkthrough of the finance operations software.";
  const walkthroughLink = getWhatsAppLink(walkthroughMsg);
  
  // Bind CTA links
  const walkthroughBtn = document.querySelector("#navWalkthrough");
  const heroCTABtn = document.querySelector("#heroCTA");
  const pricingCTABtn = document.querySelector("#pricingCTA");
  const bottomCTABtn = document.querySelector("#bottomCTA");
  
  if (walkthroughBtn) walkthroughBtn.href = walkthroughLink;
  if (heroCTABtn) heroCTABtn.href = walkthroughLink;
  if (pricingCTABtn) pricingCTABtn.href = getWhatsAppLink("Hi LogTraq, I'm interested in the Filing Season Pilot for R800.");
  if (bottomCTABtn) bottomCTABtn.href = walkthroughLink;

  // Bind SignIn and Demo triggers to activate interactive portal
  const navSignIn = document.querySelector("#navSignIn");
  const heroDemo = document.querySelector("#heroDemo");
  
  const activateDemo = () => {
    document.body.classList.add("portal-active");
    renderPortal();
  };
  
  if (navSignIn) navSignIn.addEventListener("click", activateDemo);
  if (heroDemo) heroDemo.addEventListener("click", activateDemo);
}

// Initialize landing triggers
initializeLandingPage();
