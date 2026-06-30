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

const clients = [
  {
    name: "A. Mokoena",
    email: "amokoena@example.com",
    phone: "+27 72 000 0001",
    status: 2,
    income: "IRP5 received",
    missing: ["Medical aid certificate", "Travel logbook"],
    uploaded: ["ID document", "IRP5 / IT3(a)"],
    updated: "Today, 08:14",
  },
  {
    name: "L. Naidoo",
    email: "lnaidoo@example.com",
    phone: "+27 73 000 0002",
    status: 4,
    income: "Ready with deductions",
    missing: [],
    uploaded: [
      "ID document",
      "IRP5 / IT3(a)",
      "Medical aid certificate",
      "Retirement annuity certificate",
    ],
    updated: "Yesterday, 17:42",
  },
  {
    name: "T. Dlamini",
    email: "tdlamini@example.com",
    phone: "+27 74 000 0003",
    status: 1,
    income: "Awaiting first upload",
    missing: ["ID document", "IRP5 / IT3(a)", "Medical aid certificate"],
    uploaded: [],
    updated: "Yesterday, 10:05",
  },
];

const app = document.querySelector("#app");
const config = window.LOGTRAQ_CONFIG || {};
let selectedClientIndex = 0;
let clientMode = false;
let supabaseClientPromise;

function salesHref() {
  if (!config.salesWhatsApp) return "#pricing";
  const message = encodeURIComponent("Hi LogTraq, I want the R800 tax portal launch setup");
  return `https://wa.me/${config.salesWhatsApp.replace(/[^0-9]/g, "")}?text=${message}`;
}

async function getSupabaseClient() {
  if (!config.supabaseUrl || !config.supabaseAnonKey) return null;
  if (!supabaseClientPromise) {
    supabaseClientPromise = import("https://esm.sh/@supabase/supabase-js@2").then(({ createClient }) =>
      createClient(config.supabaseUrl, config.supabaseAnonKey)
    );
  }
  return supabaseClientPromise;
}

async function uploadTaxDocument(client, documentType, file) {
  const supabase = await getSupabaseClient();
  if (!supabase) return { mode: "demo" };

  const bucket = config.storageBucket || "tax-documents";
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `demo-practice/${client.email || client.name}/${Date.now()}-${cleanName}`;
  const uploadResult = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (uploadResult.error) {
    console.warn("Supabase upload failed; keeping demo state only.", uploadResult.error);
    return { mode: "demo", error: uploadResult.error.message };
  }

  return { mode: "supabase", path };
}

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
    point.append(dot, label, small);
    wrap.appendChild(point);
  });

  return wrap;
}

function renderLanding() {
  const shell = el("main", "site-shell");

  const nav = el("nav", "topbar");
  nav.innerHTML = `
    <a class="brand" href="#" aria-label="LogTraq home">
      <span class="brand-mark">LQ</span>
      <span>LogTraq</span>
    </a>
    <div class="nav-actions">
      <button class="ghost-button" id="viewDemo">View portal</button>
      <a class="primary-button" href="${salesHref()}" target="_blank" rel="noreferrer">Book R800 setup</a>
    </div>
  `;

  const hero = el("section", "hero");
  hero.innerHTML = `
    <div class="hero-copy">
      <p class="eyebrow">Tax season client admin</p>
      <h1>Give every tax client a clean upload portal and progress tracker.</h1>
      <p class="hero-text">LogTraq helps small tax practices collect documents, see who is ready, and reduce repeated WhatsApp follow-ups during filing season.</p>
      <div class="hero-actions">
        <button class="primary-button" id="openPortal">Open demo portal</button>
        <a class="secondary-link" href="#pricing">See launch offer</a>
      </div>
    </div>
    <div class="hero-media">
      <img src="./assets/portal-workspace.webp" alt="Laptop showing a professional dashboard" />
      <div class="floating-stat">
        <span>Ready to file</span>
        <strong>18 clients</strong>
      </div>
    </div>
  `;

  const journey = el("section", "section-block tracker-preview");
  journey.innerHTML = `
    <div>
      <p class="eyebrow">Visual client journey</p>
      <h2>Clients see exactly where they are.</h2>
      <p>Practitioners see the same journey as a pipeline: what is missing, what is ready, and what needs attention today.</p>
    </div>
  `;
  journey.appendChild(renderJourney(3));

  const grid = el("section", "value-grid");
  [
    ["Client intake", "Collect contact details, tax year context, and consent before documents arrive."],
    ["Document tracker", "Show each client what is uploaded, what is missing, and what the practice still needs."],
    ["Practice dashboard", "Keep all clients in one queue instead of searching through WhatsApp threads."],
  ].forEach(([title, body]) => {
    const card = el("article", "value-card");
    card.innerHTML = `<h3>${title}</h3><p>${body}</p>`;
    grid.appendChild(card);
  });

  const pricing = el("section", "pricing-band");
  pricing.id = "pricing";
  pricing.innerHTML = `
    <div>
      <p class="eyebrow">Launch offer</p>
      <h2>R800 setup for the first tax practices.</h2>
      <p>Includes a branded portal, intake flow, client progress tracker, and document upload-ready interface.</p>
    </div>
    <a class="primary-button" href="${salesHref()}" target="_blank" rel="noreferrer">Claim launch setup</a>
  `;

  shell.append(nav, hero, journey, grid, pricing);
  app.replaceChildren(shell);

  document.querySelector("#openPortal").addEventListener("click", () => renderPortal());
  document.querySelector("#viewDemo").addEventListener("click", () => renderPortal());
}

function metric(label, value, detail) {
  const node = el("article", "metric-card");
  node.innerHTML = `<span>${label}</span><strong>${value}</strong><small>${detail}</small>`;
  return node;
}

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

function renderDocuments(client) {
  const wrap = el("div", "doc-grid");
  requiredDocs.forEach((doc) => {
    const uploaded = client.uploaded.includes(doc);
    const item = el("label", uploaded ? "doc-slot uploaded" : "doc-slot");
    item.innerHTML = `
      <span>
        <strong>${doc}</strong>
        <small>${uploaded ? "Uploaded" : "Waiting for client"}</small>
      </span>
      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
    `;
    item.querySelector("input").addEventListener("change", async (event) => {
      if (!event.target.files.length) return;
      const result = await uploadTaxDocument(client, doc, event.target.files[0]);
      if (!client.uploaded.includes(doc)) client.uploaded.push(doc);
      client.missing = client.missing.filter((missing) => missing !== doc);
      client.updated = result.mode === "supabase" ? "Uploaded to Supabase" : "Demo upload only";
      renderPortal();
    });
    wrap.appendChild(item);
  });
  return wrap;
}

function renderPortal() {
  const client = clients[selectedClientIndex];
  const shell = el("main", "portal-shell");

  const sidebar = el("aside", "sidebar");
  sidebar.innerHTML = `
    <a class="brand portal-brand" href="#">
      <span class="brand-mark">LQ</span>
      <span>LogTraq Tax</span>
    </a>
    <button class="side-link active">Dashboard</button>
    <button class="side-link">Clients</button>
    <button class="side-link">Documents</button>
    <button class="side-link">Settings</button>
    <button class="side-link muted" id="backHome">Landing page</button>
  `;

  const content = el("section", "portal-content");
  const header = el("header", "portal-header");
  header.innerHTML = `
    <div>
      <p class="eyebrow">Practitioner workspace</p>
      <h1>${clientMode ? "Client progress view" : "Tax practice dashboard"}</h1>
    </div>
    <div class="toggle-group" role="group" aria-label="View mode">
      <button class="${clientMode ? "" : "active"}" id="practiceMode">Practice</button>
      <button class="${clientMode ? "active" : ""}" id="clientMode">Client</button>
    </div>
  `;

  const metrics = el("section", "metrics");
  metrics.append(
    metric("Active clients", "42", "Tax season queue"),
    metric("Ready to file", "18", "All required docs received"),
    metric("Missing documents", "27", "Follow-ups needed")
  );

  if (clientMode) {
    const clientView = el("section", "client-view");
    clientView.innerHTML = `
      <div class="client-hero">
        <p class="eyebrow">For ${client.name}</p>
        <h2>Your tax return is at: ${statusLabel(client.status)}</h2>
        <p>Upload the remaining documents below. Your practitioner will update this progress tracker as your return moves through review and submission.</p>
      </div>
    `;
    clientView.append(renderJourney(client.status), renderDocuments(client));
    content.append(header, clientView);
  } else {
    const workspace = el("section", "workspace-grid");
    const left = el("div", "panel");
    left.innerHTML = `
      <div class="panel-head">
        <div>
          <p class="eyebrow">Client queue</p>
          <h2>Today&apos;s filing work</h2>
        </div>
      </div>
    `;
    left.appendChild(renderClientList());

    const right = el("div", "panel client-detail");
    right.innerHTML = `
      <div class="panel-head">
        <div>
          <p class="eyebrow">Selected client</p>
          <h2>${client.name}</h2>
          <p>${client.income}</p>
        </div>
        <span class="status-pill">${statusLabel(client.status)}</span>
      </div>
    `;
    right.append(renderJourney(client.status, true));
    const missing = el("div", "missing-box");
    missing.innerHTML = `
      <h3>${client.missing.length ? "Missing documents" : "Ready for practitioner review"}</h3>
      <p>${client.missing.length ? client.missing.join(", ") : "All required launch-demo documents are uploaded."}</p>
      <a class="secondary-button" href="https://wa.me/${client.phone.replace(/[^0-9]/g, "")}?text=Hi%2C%20please%20upload%20your%20remaining%20tax%20documents%20to%20your%20LogTraq%20portal." target="_blank" rel="noreferrer">WhatsApp follow-up</a>
    `;
    right.append(missing, renderDocuments(client));

    workspace.append(left, right);
    content.append(header, metrics, workspace);
  }

  shell.append(sidebar, content);
  app.replaceChildren(shell);

  document.querySelector("#backHome").addEventListener("click", renderLanding);
  document.querySelector("#practiceMode").addEventListener("click", () => {
    clientMode = false;
    renderPortal();
  });
  document.querySelector("#clientMode").addEventListener("click", () => {
    clientMode = true;
    renderPortal();
  });
}

renderLanding();
