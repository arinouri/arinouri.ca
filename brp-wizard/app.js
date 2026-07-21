/* BRP Wizard — LocalStorage mock DB
   1 BRP = 1 record.
*/
(() => {
  'use strict';

  // ---------------------------
  // Storage / Data Model
  // ---------------------------
  const STORE_KEY = 'brp_tool_store_v1';

  const GATES = [
    { n: 1, name: 'Gate 1 — Identification', short: 'Identification', phase: 'Identification (ID)', body: 'Create the BRP shell and capture early project intent.' },
    { n: 2, name: 'Gate 2 — Identification Updates', short: 'ID Updates', phase: 'Identification (ID)', body: 'Refine and validate Gate 1 information before analysis begins.' },
    { n: 3, name: 'Gate 3 — Options Analysis & Measurement', short: 'Options Analysis', phase: 'Options Analysis (OA)', body: 'Add benefit reporting dates, frequency, and expected realization.' },
    { n: 4, name: 'Gate 4 — Project Charter & PMP', short: 'Charter/PMP', phase: 'Options Analysis (OA)', body: 'Record KPI actuals and lessons learned as the project transitions to definition.' },
    { n: 5, name: 'Gate 5 — Definition', short: 'Definition', phase: 'Definition (DEF)', body: 'Lock in scope, approved benefits, and transition activities.' },
    { n: 6, name: 'Gate 6 — Implementation', short: 'Implementation', phase: 'Implementation (IMP)', body: 'Operational monitoring: KPI actuals + benefit realization progress.' },
    { n: 7, name: 'Gate 7 — Closeout', short: 'Closeout', phase: 'Transition to Closeout', body: 'Finalize values, lessons learned, sign-off and archive.' },
  ];

  const ORGS = [
    'ADM(Mat)', 'ADM(IM)', 'ADM(Fin)', 'ADM(HR-Civ)', 'CIO / IM Group',
    'Project Management Office (PMO)', 'Other'
  ];

  const ROLE_TYPES = ['Project Leader','Project Sponsor','Project Implementer','Project Director','Project Manager','Business Owner'];

  const REPORT_FREQ = ['Monthly','Quarterly','Annually'];

  function nowISO() {
    return new Date().toISOString();
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function defaultStore() {
    return {
      idCounter: 0,
      brps: [],
      lastOpenedBrpId: null,
      audit: [] // optional lightweight log (mock)
    };
  }

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaultStore();
      const parsed = JSON.parse(raw);
      return { ...defaultStore(), ...parsed };
    } catch {
      return defaultStore();
    }
  }

  function saveStore(store) {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }

  function pushAudit(store, entry) {
    store.audit.push({ at: nowISO(), ...entry });
    // keep last 2000 (portfolio-level history)
    if (store.audit.length > 2000) store.audit = store.audit.slice(-2000);
  }

  function ensureHistory(brp) {
    brp.history = Array.isArray(brp.history) ? brp.history : [];
    return brp;
  }

  function logBrp(store, brp, action, meta = {}) {
    ensureHistory(brp);
    const evt = { at: nowISO(), action, ...deepClone(meta) };
    brp.history.push(evt);
    // keep last 500 events per BRP
    if (brp.history.length > 500) brp.history = brp.history.slice(-500);
    pushAudit(store, { type: 'brp_event', brpId: brp.id, action, ...deepClone(meta) });
  }

  function nextBrpId(store) {
    store.idCounter += 1;
    const id = String(store.idCounter).padStart(6, '0');
    return id;
  }


  function seedDemoData(store) {
    if (Array.isArray(store.brps) && store.brps.length) return false;

    const seeds = [
      {
        title: 'Fleet Logistics Digital Uplift',
        projectNumber: 'GOV-FLT-2026-02',
        programmeType: 'Project',
        gate: 6,
        status: 'In Progress',
        createdDaysAgo: 120,
        updatedDaysAgo: 7,
        leadOrg: 'Project Management Office (PMO)',
        outcomes: ['Faster materiel tracking', 'Lower manual workload', 'Improved auditability'],
        benefits: [
          { name: 'Reduce shipment processing time', owner: 'Logistics Ops', position: 'Business Owner' },
          { name: 'Improve inventory accuracy', owner: 'Supply Chain', position: 'Business Owner' },
        ],
        kpis: [
          { kpi: 'Average processing time (hrs)', baseline: '18', target: '10', unit: 'hrs' },
          { kpi: 'Inventory variance (%)', baseline: '7', target: '3', unit: '%' },
        ]
      },
      {
        title: 'Secure Network Segmentation Refresh',
        projectNumber: 'GOV-CYB-2025-11',
        programmeType: 'Project',
        gate: 4,
        status: 'In Progress',
        createdDaysAgo: 90,
        updatedDaysAgo: 20,
        leadOrg: 'CIO / IM Group',
        outcomes: ['Reduced lateral movement risk', 'Clearer service boundaries'],
        benefits: [{ name: 'Reduce critical incidents', owner: 'Cyber Operations', position: 'Business Owner' }],
        kpis: [
          { kpi: 'High severity incidents / qtr', baseline: '6', target: '3', unit: 'count' },
        ]
      },
      {
        title: 'Base Infrastructure Renewal — Phase 1',
        projectNumber: 'GOV-INF-2026-01',
        programmeType: 'Programme',
        gate: 5,
        status: 'In Progress',
        createdDaysAgo: 160,
        updatedDaysAgo: 14,
        leadOrg: 'ADM(Mat)',
        outcomes: ['Safer facilities', 'Reduced unplanned downtime'],
        benefits: [{ name: 'Reduce emergency maintenance', owner: 'Facilities', position: 'Business Owner' }],
        kpis: [{ kpi: 'Unplanned downtime (hrs/mo)', baseline: '42', target: '25', unit: 'hrs' }]
      },
      {
        title: 'HR Case Management Modernization',
        projectNumber: 'GOV-HR-2025-09',
        programmeType: 'Project',
        gate: 3,
        status: 'In Progress',
        createdDaysAgo: 60,
        updatedDaysAgo: 2,
        leadOrg: 'ADM(HR-Civ)',
        outcomes: ['Faster case resolution', 'Better service tracking'],
        benefits: [{ name: 'Reduce average case resolution time', owner: 'HR Service Centre', position: 'Business Owner' }],
        kpis: [{ kpi: 'Average resolution time (days)', baseline: '14', target: '9', unit: 'days' }]
      },
      {
        title: 'Financial Controls Automation',
        projectNumber: 'GOV-FIN-2025-08',
        programmeType: 'Project',
        gate: 7,
        status: 'Complete',
        createdDaysAgo: 220,
        updatedDaysAgo: 35,
        leadOrg: 'ADM(Fin)',
        outcomes: ['Fewer manual corrections', 'Improved monthly close'],
        benefits: [{ name: 'Reduce reconciliation effort', owner: 'Finance Ops', position: 'Business Owner' }],
        kpis: [{ kpi: 'Close cycle time (days)', baseline: '8', target: '5', unit: 'days' }]
      },
      {
        title: 'Training Delivery Platform Upgrade',
        projectNumber: 'GOV-TRN-2026-03',
        programmeType: 'Project',
        gate: 2,
        status: 'Draft',
        createdDaysAgo: 14,
        updatedDaysAgo: 14,
        leadOrg: 'Other',
        outcomes: ['Improved learner access', 'More consistent reporting'],
        benefits: [],
        kpis: []
      },
      {
        title: 'Records & Retention Standardization',
        projectNumber: 'GOV-IM-2025-12',
        programmeType: 'Programme',
        gate: 1,
        status: 'Draft',
        createdDaysAgo: 5,
        updatedDaysAgo: 5,
        leadOrg: 'ADM(IM)',
        outcomes: ['Clearer retention rules', 'Reduced duplication'],
        benefits: [],
        kpis: []
      },
      {
        title: 'Procurement Workflow Simplification',
        projectNumber: 'GOV-PRC-2025-10',
        programmeType: 'Project',
        gate: 6,
        status: 'In Progress',
        createdDaysAgo: 110,
        updatedDaysAgo: 9,
        leadOrg: 'ADM(Mat)',
        outcomes: ['Shorter cycle time', 'Better visibility of approvals'],
        benefits: [{ name: 'Reduce average procurement cycle time', owner: 'Procurement', position: 'Business Owner' }],
        kpis: [{ kpi: 'Cycle time (days)', baseline: '32', target: '22', unit: 'days' }]
      },
    ];

    // Create BRPs
    seeds.forEach((s, i) => {
      const id = nextBrpId(store);
      const createdAt = isoFromDaysAgo(s.createdDaysAgo);
      const updatedAt = isoFromDaysAgo(s.updatedDaysAgo);

      const brp = ensureHistory(ensureArrays({
        id,
        title: s.title,
        projectNumber: s.projectNumber,
        programmeType: s.programmeType,
        gate: clampInt(s.gate,1,7),
        status: s.status,
        createdAt,
        updatedAt,
        g1: {
          projectName: s.title,
          projectNumber: s.projectNumber,
          projectOrProgramme: s.programmeType,
          brpStatus: s.status,
          leadOrg: s.leadOrg,
          summary: (s.outcomes || []).slice(0,2).join(' / ')
        },
        g2: {
          outcomes: (s.outcomes || []).map((t, idx) => ({ outcome: `Outcome ${idx+1}`, statement: t })),
          benefits: (s.benefits || []).map((b, idx) => ({ benefit: b.name, businessOwner: b.owner, position: b.position || 'Business Owner' })),
          kpis: (s.kpis || []).map((k, idx) => ({ kpi: k.kpi, baseline: k.baseline, target: k.target, unit: k.unit || '' })),
          roles: [
            { roleType: 'Project Leader', name: 'Alex Morgan', org: s.leadOrg || 'PMO' },
            { roleType: 'Project Sponsor', name: 'Taylor Singh', org: s.leadOrg || 'PMO' },
          ],
          options: [
            { option: 'Option A', summary: 'Incremental enhancement', selected: 'Yes' },
            { option: 'Option B', summary: 'Full replacement', selected: 'No' },
          ]
        },
        g3: { benefitReporting: (s.kpis || []).slice(0,3).map((k, idx) => ({
          benefit: (s.benefits && s.benefits[idx] ? s.benefits[idx].name : `Benefit ${idx+1}`),
          kpi: k.kpi,
          baseline: k.baseline,
          target: k.target,
          firstReportingDate: shortDateFromDaysAgo(Math.max(1, s.updatedDaysAgo-3)),
          targetEndDate: shortDateFromDaysAgo(Math.max(1, s.updatedDaysAgo-120)),
          frequency: 'Quarterly'
        }))},
        g4: { kpiActuals: (s.kpis || []).slice(0,2).map((k, idx) => ({
          kpi: k.kpi,
          actual: String(Math.round((parseFloat(k.baseline)||10) * 0.85)),
          date: shortDateFromDaysAgo(s.updatedDaysAgo)
        })), lessons: 'Pilot implementation validated assumptions; next phase focuses on adoption and reporting consistency.' },
        g5: { approvals: [{ name: 'Governance Secretariat', date: shortDateFromDaysAgo(s.updatedDaysAgo), note: 'Reviewed for completeness.' }] },
        g6: { kpiActuals: [] },
        g7: { closeoutNotes: s.status === 'Complete' ? 'Closed and archived; benefits tracking transitioned to operations.' : '' }
      }));

      brp.history = [
        { at: createdAt, action: 'created', gate: brp.gate, status: brp.status },
        { at: updatedAt, action: 'updated', gate: brp.gate, status: brp.status },
      ];

      store.brps.push(brp);
    });

    store.lastOpenedBrpId = store.brps[0]?.id || null;
    return true;
  }

  function isoFromDaysAgo(days) {
    const d = new Date(Date.now() - days * 86400000);
    return d.toISOString();
  }
  function shortDateFromDaysAgo(days) {
    const d = new Date(Date.now() - days * 86400000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${yyyy}-${mm}-${dd}`;
  }


  function calcProgressPercent(brp) {
    const gate = clampInt(brp.gate, 1, 7);
    const pct = Math.round((gate - 1) / 6 * 100); // gate 1 => 0%, gate 7 => 100%
    return clampInt(pct, 0, 100);
  }

  function deriveStatus(brp) {
    if (String(brp.status || '').toLowerCase() === 'complete') return 'Complete';
    if (brp.gate >= 7) return 'Complete';
    if (brp.updatedAt && brp.createdAt && brp.updatedAt !== brp.createdAt) return 'In Progress';
    return 'Draft';
  }

  function clampInt(x, min, max) {
    const n = parseInt(x, 10);
    if (Number.isNaN(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function findBrp(store, id) {
    return store.brps.find(b => b.id === id) || null;
  }

  function ensureArrays(brp) {
    brp.g2 = brp.g2 || {};
    brp.g2.outcomes = Array.isArray(brp.g2.outcomes) ? brp.g2.outcomes : [];
    brp.g2.options = Array.isArray(brp.g2.options) ? brp.g2.options : [];
    brp.g2.roles = Array.isArray(brp.g2.roles) ? brp.g2.roles : [];
    brp.g2.benefits = Array.isArray(brp.g2.benefits) ? brp.g2.benefits : [];
    brp.g2.kpis = Array.isArray(brp.g2.kpis) ? brp.g2.kpis : [];

    brp.g3 = brp.g3 || { benefitReporting: [] };
    brp.g3.benefitReporting = Array.isArray(brp.g3.benefitReporting) ? brp.g3.benefitReporting : [];

    brp.g4 = brp.g4 || { kpiActuals: [], lessons: '' };
    brp.g4.kpiActuals = Array.isArray(brp.g4.kpiActuals) ? brp.g4.kpiActuals : [];

    brp.g5 = brp.g5 || { kpiActuals: [], lessons: '', transitions: [] };
    brp.g5.kpiActuals = Array.isArray(brp.g5.kpiActuals) ? brp.g5.kpiActuals : [];
    brp.g5.transitions = Array.isArray(brp.g5.transitions) ? brp.g5.transitions : [];

    brp.g6 = brp.g6 || { kpiActuals: [], lessons: '', realized: [] };
    brp.g6.kpiActuals = Array.isArray(brp.g6.kpiActuals) ? brp.g6.kpiActuals : [];
    brp.g6.realized = Array.isArray(brp.g6.realized) ? brp.g6.realized : [];

    brp.g7 = brp.g7 || { kpiActuals: [], lessons: '', realized: [], signoff: '' };
    brp.g7.kpiActuals = Array.isArray(brp.g7.kpiActuals) ? brp.g7.kpiActuals : [];
    brp.g7.realized = Array.isArray(brp.g7.realized) ? brp.g7.realized : [];
    return brp;
  }

  // ---------------------------
  // DOM helpers
  // ---------------------------
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function esc(s) {
    return String(s ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function toast(title, msg) {
    const el = $('#toast');
    el.innerHTML = `<div class="t">${esc(title)}</div><div class="m">${esc(msg)}</div>`;
    el.classList.add('show');
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(()=> el.classList.remove('show'), 2600);
  }

  function setActiveNav(route) {
    $$('.top-nav a').forEach(a => a.classList.remove('active'));
    const map = {
      home: '#nav-home',
      create: '#nav-create',
      governance: '#nav-governance',
      analytics: '#nav-analytics',
      help: '#nav-help',
      list: '#nav-list',
    };
    const id = map[route] || '#nav-home';
    const el = $(id);
    if (el) el.classList.add('active');
  }

  function route() {
    const hash = location.hash || '#/home';
    const m = hash.match(/^#\/([a-z]+)(?:\/(.*))?$/i);
    if (!m) return { page:'home', param:null };
    const param = (m[2] || null);
    return { page:m[1].toLowerCase(), param: param ? String(param).split('?')[0] : null };
  }

  function countBy(arr, keyFn) {
    const out = {};
    for (const item of (arr || [])) {
      const k = String(keyFn(item) ?? '');
      out[k] = (out[k] || 0) + 1;
    }
    return out;
  }

  function toNum(x) {
    if (x === null || x === undefined) return null;
    const n = Number(String(x).replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : null;
  }

  function safeText(x, fallback='—') {
    const s = String(x ?? '').trim();
    return s ? s : fallback;
  }

  // ---------------------------
  // Pages
  // ---------------------------
    function renderHome(store) {
    setActiveNav('home');

    const rows = store.brps
      .slice()
      .sort((a,b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

    const total = store.brps.length;
    const statusCounts = countBy(store.brps, b => deriveStatus(b));
    const inProgress = (statusCounts['In Progress'] || 0);
    const drafts = (statusCounts['Draft'] || 0);
    const completed = (statusCounts['Complete'] || 0);
    const avgGate = total ? (store.brps.reduce((s,b)=>s+clampInt(b.gate,1,7),0) / total) : 0;

    const lastId = store.lastOpenedBrpId;
    const lastBrp = lastId ? findBrp(store, lastId) : null;

    // Mini “gate distribution” bars (top 4 gates only to keep it compact)
    const gateCounts = {};
    for (const g of GATES) gateCounts[g.n] = 0;
    store.brps.forEach(b => gateCounts[clampInt(b.gate,1,7)]++);
    const topGates = GATES
      .map(g => ({...g, count: gateCounts[g.n] || 0}))
      .sort((a,b)=>b.count-a.count)
      .slice(0, 4);

    $('#app').innerHTML = `
      <div class="hero">
        <div class="toolbar" style="justify-content:space-between;align-items:flex-start;gap:14px;">
          <div>
            <h1>Benefits Realization Plan (BRP) Tool</h1>
            <div class="subtitle">
              Create, update, and present BRPs across <strong>7 governance gates</strong>. Save drafts anytime, resume later, and generate a clean governance pack for decision-makers.
            </div>
          </div>
          <div class="toolbar" style="justify-content:flex-end;">
            <span class="pill">1 BRP = 1 record</span>
            <a class="btn" href="#/help">How to use</a>
            <a class="btn primary" href="#/wizard/${esc(lastBrp ? lastBrp.id : '')}" ${lastBrp ? '' : 'aria-disabled="true" style="pointer-events:none;opacity:.55;"'}>Resume last</a>
          </div>
        </div>

        <div class="stat-grid" aria-label="Portfolio summary metrics">
          <div class="stat">
            <div class="label">Total BRPs</div>
            <div class="value">${esc(total)}</div>
            <div class="hint">Across all gates</div>
          </div>
          <div class="stat">
            <div class="label">In progress</div>
            <div class="value">${esc(inProgress)}</div>
            <div class="hint">Actively being worked</div>
          </div>
          <div class="stat">
            <div class="label">Drafts</div>
            <div class="value">${esc(drafts)}</div>
            <div class="hint">Not yet advanced</div>
          </div>
          <div class="stat">
            <div class="label">Completed</div>
            <div class="value">${esc(completed)}</div>
            <div class="hint">Gate 7 / complete</div>
          </div>
        </div>

        <div class="hr"></div>

        <div class="grid two">
          <div>
            <div class="toolbar" style="justify-content:space-between;">
              <strong>Quick start</strong>
              <span class="muted">Average gate: ${esc(avgGate.toFixed(1))}</span>
            </div>
            <ol style="margin:8px 0 0;">
              <li>Create a BRP (Gate 1 shell) and capture the project basics.</li>
              <li>Use <strong>Next Gate</strong> to move forward when required fields are met.</li>
              <li>Use <strong>Save Draft</strong> anytime (never blocks).</li>
              <li>When ready for governance (Gate 5+), open <strong>Governance</strong> to view/print a pack.</li>
            </ol>

            <div class="hr"></div>

            <div class="mini-bars" aria-label="Top gates by volume">
              ${topGates.map(g => {
                const pct = total ? Math.round((g.count / total) * 100) : 0;
                return `
                  <div class="mini-bar">
                    <div class="t">
                      <div><strong>Gate ${esc(g.n)}</strong> <span class="muted">— ${esc(g.short)}</span></div>
                      <div class="k">${esc(g.count)} (${esc(pct)}%)</div>
                    </div>
                    <div class="bar"><div style="width:${pct}%"></div></div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="card">
            <div class="card-hd"><h2 style="margin:0;">Quick actions</h2></div>
            <div class="card-bd">
              <div class="notice" style="margin-top:0;">
                <strong>Start here:</strong> create a new BRP, or resume an existing one.
              </div>
              <div class="toolbar" style="flex-wrap:wrap;gap:10px;">
                <a class="btn primary" href="#/create">+ Create new BRP</a>
                ${lastBrp ? `<a class="btn" href="#/wizard/${esc(lastBrp.id)}">Resume last (${esc(lastBrp.id)})</a>` : `<span class="muted">No BRP opened yet.</span>`}
                <a class="btn" href="#/governance">Governance packs</a>
                <a class="btn" href="#/analytics">Analytics</a>
              </div>
              <div class="hr"></div>
              <div class="help">
                Tip: the wizard enforces gate order. Use <strong>Save Draft</strong> anytime to avoid losing work.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid two" style="margin-top:14px;">
        <section class="card">
          <div class="card-hd"><h2 style="margin:0;">Find / Resume</h2></div>
          <div class="card-bd">
            <div class="field">
              <label for="search">Search by BRP ID or Project Name</label>
              <input id="search" type="text" placeholder="e.g., 000014 or ERP"/>
            </div>

            <div class="toolbar">
              <button class="btn" id="btn_search">Search</button>
              <button class="btn ghost" id="btn_clear">Clear</button>
              ${lastBrp ? `<button class="btn" id="btn_resume_last">Resume last opened: ${esc(lastBrp.id)}</button>` : ''}
              <a class="btn" href="#/analytics">Analytics</a>
              <a class="btn" href="#/governance">Governance</a>
            </div>

            <div class="hr"></div>
            <div id="search_results" class="help">Search results will appear here.</div>
          </div>
        </section>

        <section class="card">
          <div class="card-hd"><h2 style="margin:0;">At a glance</h2></div>
          <div class="card-bd">
            <div class="kv">
              <div class="k">Governance-ready (Gate 5+)</div><div><strong>${esc(store.brps.filter(b=>clampInt(b.gate,1,7) >= 5).length)}</strong></div>
              <div class="k">Last updated</div><div>${esc(rows[0] ? fmtDate(rows[0].updatedAt || rows[0].createdAt) : '—')}</div>
              <div class="k">Storage</div><div class="muted">Local browser storage (mock DB)</div>
              <div class="k">Future</div><div class="muted">Swap storage layer to SharePoint lists</div>
            </div>
            <div class="hr"></div>
            <div class="notice">
              <strong>Governance pack</strong>
              Use <strong>Governance → View/Print</strong> to generate an organized sheet to present at governance.
            </div>
          </div>
        </section>
      </div>

      <h2 style="margin-top:18px;">Recent BRPs</h2>
      <div class="table-wrap">
        <table aria-label="BRP list">
          <thead>
            <tr>
              <th>ID</th>
              <th>Project</th>
              <th>Gate</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows.slice(0, 10).map(b => {
              const gate = clampInt(b.gate, 1, 7);
              const st = deriveStatus(b);
              const g = GATES.find(x => x.n === gate);
              return `
                <tr>
                  <td><code>${esc(b.id)}</code></td>
                  <td><strong>${esc(b.title || '')}</strong><div class="muted">${esc(b.projectNumber || '')}</div></td>
                  <td>Gate ${esc(gate)}<div class="muted">${esc(g?.short || '')}</div></td>
                  <td>${badge(st)}</td>
                  <td>${esc(fmtDate(b.updatedAt || b.createdAt))}</td>
                  <td><button class="btn small" data-open="${esc(b.id)}">Open</button></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="hr"></div>
      <div class="help">Tip: the <strong>Overview</strong> page shows the full portfolio list and filters.</div>
    `;

    // Search / resume
    const renderSearchResults = (hits) => {
      const el = $('#search_results');
      if (!hits.length) {
        el.innerHTML = `<div class="muted">No matches.</div>`;
        return;
      }
      el.innerHTML = hits.slice(0, 10).map(b => {
        const gate = clampInt(b.gate, 1, 7);
        const g = GATES.find(x => x.n === gate);
        return `
          <div class="toolbar" style="justify-content:space-between;margin:8px 0;">
            <div>
              <strong>${esc(b.id)}</strong> — ${esc(b.title || '')}
              <div class="muted">Gate ${esc(gate)} · ${esc(g?.short || '')}</div>
            </div>
            <button class="btn small" data-open="${esc(b.id)}">Open</button>
          </div>
        `;
      }).join('');
      $$('[data-open]', el).forEach(btn => btn.addEventListener('click', () => {
        location.hash = '#/wizard/' + btn.getAttribute('data-open');
      }));
    };

    $('#btn_search').addEventListener('click', () => {
      const q = getVal('search').trim().toLowerCase();
      if (!q) return toast('Search', 'Type a BRP ID or project keyword.');
      const hits = store.brps.filter(b =>
        String(b.id).toLowerCase().includes(q) ||
        String(b.title || '').toLowerCase().includes(q) ||
        String(b.projectNumber || '').toLowerCase().includes(q)
      ).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
      renderSearchResults(hits);
    });

    $('#btn_clear').addEventListener('click', () => {
      $('#search').value = '';
      $('#search_results').innerHTML = 'Search results will appear here.';
    });

    if (lastBrp && $('#btn_resume_last')) {
      $('#btn_resume_last').addEventListener('click', () => {
        location.hash = '#/wizard/' + lastBrp.id;
      });
    }

    // Recent table open buttons
    $$('[data-open]').forEach(btn => btn.addEventListener('click', () => {
      location.hash = '#/wizard/' + btn.getAttribute('data-open');
    }));

    $$('[data-view]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-view');
      const brp = findBrp(store, id);
      if (!brp) return toast('Not found', 'BRP not found.');
      logBrp(store, brp, 'governance_view', { gate: brp.gate, from: 'brp_list' });
      saveStore(store);
      location.hash = '#/governance/' + id;
    }));
    $$('[data-print]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-print');
      const brp = findBrp(store, id);
      if (!brp) return toast('Not found', 'BRP not found.');
      logBrp(store, brp, 'governance_print', { gate: brp.gate, from: 'brp_list' });
      saveStore(store);
      openPrintWindow(buildGovernancePackHTML(brp));
    }));
  }

  function renderBrpList(store) {
    setActiveNav('list');

    const rows = store.brps.slice().sort((a,b) => (a.id||'').localeCompare(b.id||''));

    $('#app').innerHTML = `
      <h1>All BRPs</h1>
      <div class="notice">
        <strong>Portfolio list</strong>
        View, edit, and generate a clean governance pack for any BRP (at any gate).
      </div>

      <div class="table-wrap" style="margin-top:14px;">
        <table aria-label="Overview table">
          <thead>
            <tr>
              <th>BRP ID</th>
              <th>Title</th>
              <th>Gate</th>
              <th>Status</th>
              <th>Progress %</th>
              <th>Last Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows.map(brp => {
              const pct = calcProgressPercent(brp);
              const status = deriveStatus(brp);
              return `
                <tr>
                  <td><strong>${esc(brp.id)}</strong></td>
                  <td>${esc(brp.title || '')}</td>
                  <td>${esc('Gate ' + clampInt(brp.gate,1,7))}</td>
                  <td>${badge(status)}</td>
                  <td>${esc(pct + '%')}</td>
                  <td class="muted">${esc(fmtDate(brp.updatedAt || brp.createdAt))}</td>
                  <td>
                    <div class="toolbar" style="justify-content:flex-start;gap:8px;flex-wrap:wrap;">
                      <button class="btn small" data-open="${esc(brp.id)}">Edit</button>
                      <button class="btn small" data-view="${esc(brp.id)}">View pack</button>
                      <button class="btn small" data-print="${esc(brp.id)}">Print</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('') : `<tr><td colspan="7" class="muted">No BRPs yet.</td></tr>`}
          </tbody>
        </table>
      </div>

      <div class="hr"></div>
      <div class="toolbar">
        <button class="btn" id="btn_export">Export (JSON)</button>
        <button class="btn danger" id="btn_reset">Reset local data</button>
      </div>
      <div class="help">Export is a mock of REQ 2.3 (data extraction). PDF/XLSX can be added later.</div>
    `;

    $$('[data-open]').forEach(btn => btn.addEventListener('click', () => {
      location.hash = '#/wizard/' + btn.getAttribute('data-open');
    }));

    $$('[data-view]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-view');
      const brp = findBrp(store, id);
      if (!brp) return toast('Not found', 'BRP not found.');
      logBrp(store, brp, 'governance_view', { gate: brp.gate, from: 'brp_list' });
      saveStore(store);
      location.hash = '#/governance/' + id;
    }));
    $$('[data-print]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-print');
      const brp = findBrp(store, id);
      if (!brp) return toast('Not found', 'BRP not found.');
      logBrp(store, brp, 'governance_print', { gate: brp.gate, from: 'brp_list' });
      saveStore(store);
      openPrintWindow(buildGovernancePackHTML(brp));
    }));

    $('#btn_export').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(store.brps, null, 2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'brp_export.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast('Exported', 'Downloaded brp_export.json');
    });

    $('#btn_reset').addEventListener('click', () => {
      if (!confirm('Reset ALL BRPs stored in this browser? This cannot be undone.')) return;
      localStorage.removeItem(STORE_KEY);
      toast('Reset', 'Local BRP data cleared.');
      location.hash = '#/home';
      render();
    });
  }

  function renderCreate(store) {
    setActiveNav('create');

    $('#app').innerHTML = `
      <div class="toolbar" style="justify-content:space-between;align-items:flex-end;">
        <div>
          <h1 style="margin-bottom:6px;">Create a new BRP</h1>
          <div class="muted">Start a new BRP at Gate 1. You can save a draft anytime and resume later.</div>
        </div>
        <div class="toolbar">
          <a class="btn" href="#/home">Back to Dashboard</a>
        </div>
      </div>

      <div class="card" style="margin-top:12px;">
        <div class="card-hd"><h2 style="margin:0;">BRP basics</h2></div>
        <div class="card-bd">
          <div class="field">
            <label for="new_title">Project Name (Title)</label>
            <input id="new_title" type="text" placeholder="e.g., ERP Modernization — Finance"/>
          </div>

          <div class="grid two">
            <div class="field">
              <label for="new_num">Project Number</label>
              <input id="new_num" type="text" placeholder="e.g., GOV-ERP-2026-01"/>
            </div>
            <div class="field">
              <label for="new_programme">Project or Programme?</label>
              <select id="new_programme">
                <option value="Project">Project</option>
                <option value="Programme">Programme</option>
              </select>
            </div>
          </div>

          <div class="grid two">
            <div class="field">
              <label for="new_status">Initial BRP Status</label>
              <select id="new_status">
                <option value="Draft">Draft</option>
                <option value="In Progress">In Progress</option>
                <option value="Complete">Complete</option>
              </select>
              <div class="help">Most BRPs start as Draft.</div>
            </div>
            <div class="field">
              <label for="new_gate">Start Gate</label>
              <select id="new_gate">
                ${GATES.map(g=>`<option value="${g.n}">${esc(g.name)}</option>`).join('')}
              </select>
              <div class="help">Normally start at Gate 1 (recommended).</div>
            </div>
          </div>

          <div class="toolbar" style="justify-content:flex-start;gap:10px;margin-top:8px;">
            <button class="btn primary" id="btn_create">Create BRP & Open Wizard</button>
            <button class="btn" id="btn_cancel">Cancel</button>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:12px;">
        <div class="card-hd"><h2 style="margin:0;">What happens next?</h2></div>
        <div class="card-bd">
          <ol style="margin:0;">
            <li>The wizard opens at your selected gate.</li>
            <li>Use <strong>Save Draft</strong> to save without advancing.</li>
            <li>Use <strong>Next Gate</strong> when required fields are complete.</li>
            <li>Use <strong>Governance</strong> to view/print a pack for decision-makers.</li>
          </ol>
        </div>
      </div>
    `;

    $('#btn_cancel').addEventListener('click', () => location.hash = '#/home');

    $('#btn_create').addEventListener('click', () => {
      const title = getVal('new_title').trim();
      const projectNumber = getVal('new_num').trim();
      const programmeType = getVal('new_programme');
      const status = getVal('new_status');
      const gate = clampInt(getVal('new_gate'), 1, 7);

      if (!title) return toast('Missing field', 'Project Name (Title) is required.');
      if (!projectNumber) return toast('Missing field', 'Project Number is required.');

      const id = nextBrpId(store);
      const brp = ensureHistory(ensureArrays({
        id,
        title,
        projectNumber,
        programmeType,
        gate,
        status,
        createdAt: nowISO(),
        updatedAt: nowISO(),
        g1: {
          projectName: title,
          projectNumber,
          projectOrProgramme: programmeType,
          brpStatus: status,
        },
        g2: {}, g3: {}, g4: {}, g5: {}, g6: {}, g7: {}
      }));

      store.brps.push(brp);
      store.lastOpenedBrpId = id;
      logBrp(store, brp, 'create', { gate, title, projectNumber });
      saveStore(store);
      toast('BRP created', `Created BRP ${id}. Opening wizard...`);
      location.hash = '#/wizard/' + id;
    });
  }

    function renderGovernance(store, brpId=null) {
    setActiveNav('governance');

    if (brpId) return renderGovernancePack(store, brpId);

    const focus = store.brps
      .filter(b => clampInt(b.gate,1,7) >= 5)
      .sort((a,b) => (b.updatedAt||'').localeCompare(a.updatedAt||''));

    $('#app').innerHTML = `
      <h1>Governance</h1>
      <div class="notice">
        <strong>Decision-maker view</strong>
        BRPs at <strong>Gate 5+</strong> are listed here. Use <strong>View</strong> to review a clean pack, or <strong>Print</strong> to generate a one-click governance sheet.
      </div>

      <div class="grid two" style="margin-top:14px;">
        ${focus.length ? focus.map(brp => governanceCard(brp)).join('') : `
          <div class="card"><div class="card-bd muted">No BRPs at Gate 5+ yet.</div></div>
        `}
      </div>
    `;

    $$('[data-view]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-view');
      const brp = findBrp(store, id);
      if (brp) logBrp(store, brp, 'governance_view', { gate: brp.gate });
      saveStore(store);
      location.hash = '#/governance/' + id;
    }));
    $$('[data-print]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-print');
      const brp = findBrp(store, id);
      if (!brp) return toast('Not found', 'BRP not found.');
      logBrp(store, brp, 'governance_print', { gate: brp.gate });
      saveStore(store);
      openPrintWindow(buildGovernancePackHTML(brp));
    }));
    $$('[data-open]').forEach(btn => btn.addEventListener('click', () => {
      location.hash = '#/wizard/' + btn.getAttribute('data-open');
    }));

    $$('[data-view]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-view');
      const brp = findBrp(store, id);
      if (!brp) return toast('Not found', 'BRP not found.');
      logBrp(store, brp, 'governance_view', { gate: brp.gate, from: 'brp_list' });
      saveStore(store);
      location.hash = '#/governance/' + id;
    }));
    $$('[data-print]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-print');
      const brp = findBrp(store, id);
      if (!brp) return toast('Not found', 'BRP not found.');
      logBrp(store, brp, 'governance_print', { gate: brp.gate, from: 'brp_list' });
      saveStore(store);
      openPrintWindow(buildGovernancePackHTML(brp));
    }));
  }

  function renderGovernancePack(store, brpId) {
    const brp = findBrp(store, brpId);
    if (!brp) {
      $('#app').innerHTML = `
        <h1>Governance</h1>
        <div class="notice red"><strong>BRP not found</strong> The BRP ID <code>${esc(brpId)}</code> does not exist.</div>
        <div class="toolbar" style="margin-top:12px;">
          <a class="btn" href="#/governance">Back to Governance</a>
          <a class="btn" href="#/home">Home</a>
        </div>
      `;
      return;
    }

    ensureArrays(brp);

    $('#app').innerHTML = `
      <div class="toolbar" style="justify-content:space-between;align-items:flex-start;gap:12px;">
        <div>
          <h1 style="margin:0;">Governance Pack</h1>
          <div class="muted">Read-only summary for governance review and printing.</div>
        </div>
        <div class="toolbar" style="justify-content:flex-end;">
          <a class="btn" href="#/governance">Back</a>
          <button class="btn" id="btn_print_pack">Print</button>
          <a class="btn primary" href="#/wizard/${esc(brp.id)}">Open wizard</a>
        </div>
      </div>

      <div class="card" style="margin-top:14px;">
        <div class="card-hd">
          <div style="font-weight:850;">${esc(brp.id)} — ${esc(brp.title || '')}</div>
          <div class="muted">${esc(safeText(brp.projectNumber))}</div>
        </div>
        <div class="card-bd">
          ${governancePackBody(brp)}
        </div>
      </div>

      <div class="help" style="margin-top:10px;">Tip: printing uses a dedicated print layout (header/footer/nav hidden).</div>
    `;

    $('#btn_print_pack').addEventListener('click', () => {
      logBrp(store, brp, 'governance_print', { gate: brp.gate });
      saveStore(store);
      openPrintWindow(buildGovernancePackHTML(brp));
    });
  }

  function openPrintWindow(html) {
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) return toast('Pop-up blocked', 'Allow pop-ups to print the governance pack.');
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    // Give the browser a tick to finish layout before printing
    window.setTimeout(() => w.print(), 60);
  }

  function getLatestKpiActualMap(brp) {
    const buckets = [brp.g7?.kpiActuals, brp.g6?.kpiActuals, brp.g5?.kpiActuals, brp.g4?.kpiActuals].filter(Boolean);
    const flat = buckets.flat().filter(Boolean);
    const map = {};
    for (const row of flat) {
      const name = String(row?.kpi || row?.name || '').trim();
      if (!name) continue;
      const at = row?.date || row?.reportingDate || row?.at || '';
      const val = row?.actual ?? row?.value ?? row?.val ?? row?.amount ?? '';
      // keep latest-ish by date string (good enough for prototype)
      if (!map[name] || String(at) > String(map[name].at)) {
        map[name] = { at, val };
      }
    }
    return map;
  }

  function governancePackBody(brp) {
    const gate = clampInt(brp.gate,1,7);
    const gdef = GATES.find(g=>g.n===gate);
    const status = deriveStatus(brp);

    const outcomes = brp.g2?.outcomes || [];
    const benefits = brp.g2?.benefits || [];
    const roles = brp.g2?.roles || [];
    const kpis = brp.g2?.kpis || [];
    const reporting = brp.g3?.benefitReporting || [];
    const latestActuals = getLatestKpiActualMap(brp);

    const govDate =
      (gate===5?brp.g5?.governanceReportingDate:
      gate===6?brp.g6?.governanceReportingDate:
      gate===7?brp.g7?.governanceReportingDate:
      brp.g1?.governanceReportingDate) || '';

    const outcomeRows = outcomes.length ? outcomes.map((o,i)=>`
      <tr>
        <td>${esc(i+1)}</td>
        <td>${esc(safeText(o.outcome || o.name || o.title))}</td>
        <td>${esc(safeText(o.benefit || o.benefits || '—'))}</td>
        <td>${esc(safeText(o.businessOwner || o.owner || '—'))}</td>
      </tr>
    `).join('') : `<tr><td colspan="4" class="muted">No outcomes entered yet.</td></tr>`;

    const roleRows = roles.length ? roles.map((r,i)=>`
      <tr>
        <td>${esc(i+1)}</td>
        <td>${esc(safeText(r.roleType || r.role))}</td>
        <td>${esc(safeText(r.name))}</td>
        <td>${esc(safeText(r.org))}</td>
      </tr>
    `).join('') : `<tr><td colspan="4" class="muted">No roles entered yet.</td></tr>`;

    const kpiRows = kpis.length ? kpis.map((k,i)=> {
      const name = String(k.kpi || k.name || '').trim();
      const baseline = safeText(k.baseline ?? k.base ?? '');
      const target = safeText(k.target ?? '');
      const actual = latestActuals[name]?.val ?? '';
      const actualAt = latestActuals[name]?.at ?? '';
      return `
        <tr>
          <td>${esc(i+1)}</td>
          <td>${esc(safeText(name))}</td>
          <td>${esc(baseline)}</td>
          <td>${esc(target)}</td>
          <td>${esc(safeText(actual))}</td>
          <td>${esc(actualAt ? fmtDate(actualAt) : '—')}</td>
        </tr>
      `;
    }).join('') : `<tr><td colspan="6" class="muted">No KPIs entered yet.</td></tr>`;

    const benefitRows = benefits.length ? benefits.map((b,i)=>`
      <tr>
        <td>${esc(i+1)}</td>
        <td>${esc(safeText(b.benefit || b.name))}</td>
        <td>${esc(safeText(b.owner || b.businessOwner || '—'))}</td>
        <td>${esc(safeText(b.kpi || b.kpiName || '—'))}</td>
      </tr>
    `).join('') : `<tr><td colspan="4" class="muted">No benefits entered yet.</td></tr>`;

    const reportingRows = reporting.length ? reporting.map((r,i)=>`
      <tr>
        <td>${esc(i+1)}</td>
        <td>${esc(safeText(r.benefit))}</td>
        <td>${esc(safeText(r.firstReportingDate))}</td>
        <td>${esc(safeText(r.frequency))}</td>
        <td>${esc(safeText(r.targetEndDate))}</td>
      </tr>
    `).join('') : `<tr><td colspan="5" class="muted">No reporting schedule entered yet.</td></tr>`;

    const lessons =
      (gate>=7 ? brp.g7?.lessons :
      gate===6 ? brp.g6?.lessons :
      gate===5 ? brp.g5?.lessons :
      brp.g4?.lessons) || '';

    const signoff = brp.g7?.signoff || '';

    return `
      <div class="notice">
        <strong>BRP Summary</strong>
        <div class="kv" style="margin-top:8px;">
          <div class="k">Gate</div><div>Gate ${esc(gate)} — ${esc(gdef?.name || '')}</div>
          <div class="k">Status</div><div>${badge(status)}</div>
          <div class="k">Upcoming governance date</div><div>${esc(safeText(govDate))}</div>
          <div class="k">Project sponsor</div><div>${esc(safeText(brp.g1?.sponsorName))}</div>
          <div class="k">Business owner</div><div>${esc(safeText(brp.g1?.businessOwnerName))}</div>
          <div class="k">Implementer</div><div>${esc(safeText(brp.g1?.implementerName))}</div>
        </div>
      </div>

      <div class="hr"></div>

      <h2 style="margin:0 0 10px;">Outcome and benefit summary</h2>
      <div class="table-wrap">
        <table aria-label="Outcome and benefit summary">
          <thead>
            <tr><th>#</th><th>Outcome</th><th>Benefits</th><th>Business owner</th></tr>
          </thead>
          <tbody>${outcomeRows}</tbody>
        </table>
      </div>

      <div class="hr"></div>

      <h2 style="margin:0 0 10px;">Benefits list</h2>
      <div class="table-wrap">
        <table aria-label="Benefits list">
          <thead>
            <tr><th>#</th><th>Benefit</th><th>Owner</th><th>KPI</th></tr>
          </thead>
          <tbody>${benefitRows}</tbody>
        </table>
      </div>

      <div class="hr"></div>

      <h2 style="margin:0 0 10px;">KPI summary</h2>
      <div class="table-wrap">
        <table aria-label="KPI summary">
          <thead>
            <tr><th>#</th><th>KPI</th><th>Baseline</th><th>Target</th><th>Latest actual</th><th>As of</th></tr>
          </thead>
          <tbody>${kpiRows}</tbody>
        </table>
      </div>

      <div class="hr"></div>

      <h2 style="margin:0 0 10px;">Reporting schedule</h2>
      <div class="table-wrap">
        <table aria-label="Reporting schedule">
          <thead>
            <tr><th>#</th><th>Benefit</th><th>First reporting date</th><th>Frequency</th><th>Target end date</th></tr>
          </thead>
          <tbody>${reportingRows}</tbody>
        </table>
      </div>

      <div class="hr"></div>

      <h2 style="margin:0 0 10px;">Key roles</h2>
      <div class="table-wrap">
        <table aria-label="Key roles">
          <thead>
            <tr><th>#</th><th>Role</th><th>Name</th><th>Organization</th></tr>
          </thead>
          <tbody>${roleRows}</tbody>
        </table>
      </div>

      <div class="hr"></div>

      <h2 style="margin:0 0 10px;">Notes</h2>
      <div class="kv">
        <div class="k">Lessons learned</div><div>${esc(safeText(lessons, '—'))}</div>
        <div class="k">Sign-off / closeout</div><div>${esc(safeText(signoff, '—'))}</div>
      </div>
    `;
  }

  function buildGovernancePackHTML(brp) {
    const gate = clampInt(brp.gate,1,7);
    const title = `${brp.id} — ${brp.title || 'BRP'}`;
    return `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${esc(title)} (Governance Pack)</title>
  <style>
    :root{--text:#111;--muted:#555;--line:#ddd;--panel:#f6f6f6;--brand:#26374a;--shadow:0 10px 30px rgba(0,0,0,.08);}
    *{box-sizing:border-box}
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:var(--text);margin:0;padding:24px}
    h1{font-size:20px;margin:0 0 4px}
    h2{font-size:14px;margin:18px 0 8px}
    .muted{color:var(--muted)}
    .bar{height:4px;background:var(--brand);margin:10px 0 16px}
    .card{border:1px solid var(--line);border-radius:14px;overflow:hidden}
    .hd{background:var(--panel);padding:12px 14px;border-bottom:1px solid var(--line)}
    .bd{padding:14px}
    .kv{display:grid;grid-template-columns:220px 1fr;gap:8px 12px}
    .kv .k{color:var(--muted)}
    table{width:100%;border-collapse:collapse}
    th,td{padding:8px;border-bottom:1px solid var(--line);vertical-align:top}
    th{background:var(--panel);text-align:left;font-weight:700}
    .hr{height:1px;background:var(--line);margin:14px 0}
    @media print{body{padding:0} .no-print{display:none !important}}\n  </style>
</head>
<body>
  <div class="no-print" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px;">
    <div>
      <h1>${esc(title)}</h1>
      <div class="muted">Governance pack — Gate ${esc(gate)}</div>
    </div>
    <button onclick="window.print()" style="border:1px solid #ccc;background:#fff;padding:8px 10px;border-radius:10px;font-weight:700;cursor:pointer;">Print</button>
  </div>

  <div class="bar"></div>

  <div class="card">
    <div class="hd">
      <div style="font-weight:850;">Benefits Realization Plan Summary</div>
      <div class="muted">${esc(safeText(brp.projectNumber))}</div>
    </div>
    <div class="bd">
      ${governancePackBody(brp)}
    </div>
  </div>

  <div class="muted" style="margin-top:12px;font-size:12px;">Generated by BRP Tool (prototype) — includes entered data only.</div>
</body>
</html>`;
  }

  function svgPie(data, size=220) {
    // data: [{label, value, colorIndex}] — colorIndex just picks a stable palette
    const total = data.reduce((s,d)=>s+(d.value||0),0) || 1;
    const r = size/2 - 6;
    const cx = size/2, cy = size/2;
    const palette = ['#26374a','#b10e1e','#1a7f37','#b45309','#0a66c2','#6b21a8','#0f766e'];
    let a0 = -Math.PI/2;
    const paths = data.map((d, i) => {
      const v = d.value || 0;
      const frac = v / total;
      const a1 = a0 + frac * Math.PI*2;
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const large = (a1 - a0) > Math.PI ? 1 : 0;
      const color = palette[(d.colorIndex ?? i) % palette.length];
      const p = `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
      a0 = a1;
      return `<path d="${p}" fill="${color}"></path>`;
    }).join('');
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Pie chart">${paths}</svg>`;
  }

  function svgGroupedBars(series, width=520, height=240) {
    // series: [{label, a,b,c}] where a/b/c are numbers
    const pad = { l:36, r:14, t:12, b:28 };
    const w = width - pad.l - pad.r;
    const h = height - pad.t - pad.b;
    const vals = [];
    series.forEach(s => ['a','b','c'].forEach(k => vals.push(s[k]||0)));
    const max = Math.max(1, ...vals);
    const palette = ['#26374a','#b10e1e','#1a7f37'];
    const groups = series.length || 1;
    const groupW = w / groups;
    const barW = Math.max(8, (groupW - 18) / 3);

    let bars = '';
    series.forEach((s, gi) => {
      const gx = pad.l + gi * groupW + 9;
      ['a','b','c'].forEach((k, bi) => {
        const v = s[k] || 0;
        const bh = (v / max) * h;
        const x = gx + bi * (barW + 4);
        const y = pad.t + (h - bh);
        bars += `<rect x="${x}" y="${y}" width="${barW}" height="${bh}" fill="${palette[bi]}"></rect>`;
      });
      const lx = pad.l + gi * groupW + groupW/2;
      bars += `<text x="${lx}" y="${pad.t+h+18}" text-anchor="middle" font-size="11" fill="#444">${esc(s.label)}</text>`;
    });

    const axis = `<line x1="${pad.l}" y1="${pad.t+h}" x2="${pad.l+w}" y2="${pad.t+h}" stroke="#bbb"/>`;
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Bar chart">${axis}${bars}</svg>`;
  }

  function computeKpiPortfolioSeries(store) {
    // Builds a compact KPI “baseline/target/actual” chart using averages (not per-project yet)
    const kpis = [];
    for (const b of store.brps) {
      const arr = (b.g2?.kpis || []).map(k => ({
        name: String(k.kpi || k.name || '').trim(),
        baseline: toNum(k.baseline ?? k.base),
        target: toNum(k.target),
        actual: toNum((getLatestKpiActualMap(b)[String(k.kpi||k.name||'').trim()]||{}).val)
      }));
      kpis.push(...arr.filter(x=>x.name));
    }
    const byName = {};
    for (const k of kpis) {
      const key = k.name;
      byName[key] = byName[key] || { name:key, baseline:[], target:[], actual:[] };
      if (k.baseline!==null) byName[key].baseline.push(k.baseline);
      if (k.target!==null) byName[key].target.push(k.target);
      if (k.actual!==null) byName[key].actual.push(k.actual);
    }
    const avg = (xs)=> xs.length ? xs.reduce((s,x)=>s+x,0)/xs.length : 0;
    const out = Object.values(byName).map(o => ({
      label: o.name.length>10 ? (o.name.slice(0,10)+'…') : o.name,
      a: avg(o.baseline),
      b: avg(o.target),
      c: avg(o.actual),
      full: o.name
    })).slice(0, 6); // keep readable
    return out;
  }

  function renderAnalytics(store) {
    setActiveNav('analytics');

    const total = store.brps.length;
    const completed = store.brps.filter(b => deriveStatus(b) === 'Complete').length;
    const drafts = store.brps.filter(b => deriveStatus(b) === 'Draft').length;
    const inProgress = store.brps.filter(b => deriveStatus(b) === 'In Progress').length;
    const avgGate = total ? (store.brps.reduce((s,b)=>s+clampInt(b.gate,1,7),0) / total) : 0;

    // Gate distribution
    const dist = {};
    for (const g of GATES) dist[g.n] = 0;
    store.brps.forEach(b => dist[clampInt(b.gate,1,7)]++);
    const gateData = GATES.map((g,i)=>({ label:'Gate '+g.n, value: dist[g.n] || 0, colorIndex:i }));

    // Status distribution
    const stCounts = countBy(store.brps, b => deriveStatus(b));
    const statusBars = [
      { label:'Draft', value: stCounts['Draft']||0 },
      { label:'In Progress', value: stCounts['In Progress']||0 },
      { label:'Complete', value: stCounts['Complete']||0 }
    ];

    // KPI performance summary (averages)
    const kpiSeries = computeKpiPortfolioSeries(store);

    $('#app').innerHTML = `
      <h1>Analytics</h1>
      <div class="notice">
        <strong>Portfolio dashboards</strong>
        Snapshots for admin and reporting. (Prototype charts — can be upgraded to Power BI / SharePoint later.)
      </div>

      <div class="grid three" style="margin-top:14px;">
        <div class="card">
          <div class="card-hd"><h2 style="margin:0;">Total BRPs</h2></div>
          <div class="card-bd"><div style="font-size:2rem;font-weight:850;">${esc(total)}</div></div>
        </div>
        <div class="card">
          <div class="card-hd"><h2 style="margin:0;">In progress</h2></div>
          <div class="card-bd"><div style="font-size:2rem;font-weight:850;">${esc(inProgress)}</div></div>
        </div>
        <div class="card">
          <div class="card-hd"><h2 style="margin:0;">Average gate</h2></div>
          <div class="card-bd"><div style="font-size:2rem;font-weight:850;">${esc(avgGate.toFixed(1))}</div></div>
        </div>
      </div>

      <div class="grid two" style="margin-top:14px;">
        <div class="card chart-card">
          <div class="card-hd"><h2 style="margin:0;">BRPs by status</h2></div>
          <div class="card-bd">
            ${statusBars.map(s => {
              const pct = total ? Math.round((s.value / total) * 100) : 0;
              return `
                <div style="margin:10px 0;">
                  <div class="toolbar" style="justify-content:space-between;">
                    <div><strong>${esc(s.label)}</strong></div>
                    <div class="muted">${esc(s.value)} (${esc(pct)}%)</div>
                  </div>
                  <div class="progress"><div style="width:${pct}%"></div></div>
                </div>
              `;
            }).join('')}
            <div class="help">Draft = started, In Progress = active, Complete = finished.</div>
          </div>
        </div>

        <div class="card chart-card">
          <div class="card-hd"><h2 style="margin:0;">BRPs by gate</h2></div>
          <div class="card-bd">
            <div class="chart-row">
              <div>
                ${GATES.map(g => {
                  const c = dist[g.n] || 0;
                  const pct = total ? Math.round((c / total) * 100) : 0;
                  return `
                    <div style="margin:10px 0;">
                      <div class="toolbar" style="justify-content:space-between;">
                        <div><strong>Gate ${esc(g.n)}</strong> <span class="muted">— ${esc(g.short)}</span></div>
                        <div class="muted">${esc(c)} (${esc(pct)}%)</div>
                      </div>
                      <div class="progress"><div style="width:${pct}%;"></div></div>
                    </div>
                  `;
                }).join('')}
              </div>
              <div class="svg-wrap">${svgPie(gateData, 210)}</div>
            </div>
          </div>
        </div>
      </div>

      <h2 style="margin-top:18px;">KPI performance (baseline vs target vs latest actual)</h2>
      <div class="card chart-card">
        <div class="card-bd">
          ${kpiSeries.length ? `
            <div class="svg-wrap">${svgGroupedBars(kpiSeries, 720, 260)}</div>
            <div class="toolbar" style="gap:14px;justify-content:flex-start;margin-top:8px;">
              <span class="badge">Baseline</span>
              <span class="badge bad">Target</span>
              <span class="badge good">Actual</span>
            </div>
            <div class="help" style="margin-top:8px;">
              Values are averaged across all BRPs that define that KPI. This is a portfolio-level snapshot (not a per-project drilldown yet).
            </div>
          ` : `
            <div class="notice red"><strong>No KPI data yet</strong> Add KPIs in Gate 2 (and actuals in Gate 4+), then return.</div>
          `}
        </div>
      </div>

      <h2 style="margin-top:18px;">Activity history</h2>
      <div class="card">
        <div class="card-bd">
          <div class="grid two">
            <div class="field">
              <label for="hist_scope">Scope</label>
              <select id="hist_scope">
                <option value="all">All BRPs (portfolio)</option>
                ${store.brps
                  .slice()
                  .sort((a,b)=>String(a.id).localeCompare(String(b.id)))
                  .map(b=>`<option value="${esc(b.id)}">${esc(b.id)} — ${esc((b.title||'').slice(0,40))}</option>`)
                  .join('')}
              </select>
              <div class="help">Choose a BRP to see its full edit history (create, saves, adds/removes, gate moves, prints).</div>
            </div>
            <div class="field">
              <label for="hist_search">Search</label>
              <input id="hist_search" type="text" placeholder="e.g., advance, gate2_add, print, KPI"/>
              <div class="help">Filters by action or text inside details.</div>
            </div>
          </div>
          <div class="hr"></div>
          <div class="table-wrap" style="max-height:360px;overflow:auto;">
            <table aria-label="History table">
              <thead>
                <tr>
                  <th style="width:180px;">When</th>
                  <th style="width:120px;">BRP</th>
                  <th style="width:180px;">Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody id="hist_body"></tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="hr"></div>
      <div class="help">Next upgrades: filters (by programme, sponsor, org), drilldowns per benefit/KPI, export to CSV/PDF, and a full admin dashboard (REQ 2.3–2.6).</div>
    `;

    const renderHistory = () => {
      const scope = getVal('hist_scope') || 'all';
      const q = getVal('hist_search').toLowerCase();

      let events = [];
      if (scope === 'all') {
        events = (store.audit || [])
          .filter(e => e.type === 'brp_event')
          .map(e => ({ at: e.at, brpId: e.brpId, action: e.action, meta: e }));
      } else {
        const brp = findBrp(store, scope);
        events = (brp?.history || []).map(e => ({ at: e.at, brpId: brp.id, action: e.action, meta: e }));
      }

      events = events
        .slice()
        .sort((a,b)=>(b.at||'').localeCompare(a.at||''));

      const match = (evt) => {
        if (!q) return true;
        const blob = (evt.action + ' ' + JSON.stringify(evt.meta || {})).toLowerCase();
        return blob.includes(q);
      };
      const rows = events.filter(match).slice(0, 500);
      const body = $('#hist_body');
      if (!rows.length) {
        body.innerHTML = `<tr><td colspan="4" class="muted">No history entries found.</td></tr>`;
        return;
      }
      body.innerHTML = rows.map(e => {
        const details = deepClone(e.meta || {});
        delete details.at;
        return `
          <tr>
            <td>${esc(fmtDate(e.at))}</td>
            <td><code>${esc(e.brpId || '')}</code></td>
            <td>${esc(String(e.action || ''))}</td>
            <td><code>${esc(JSON.stringify(details))}</code></td>
          </tr>
        `;
      }).join('');
    };

    const scopeEl = document.getElementById('hist_scope');
    const searchEl = document.getElementById('hist_search');
    if (scopeEl) scopeEl.addEventListener('change', renderHistory);
    if (searchEl) searchEl.addEventListener('input', renderHistory);
    renderHistory();
  }

function renderHelp() {
    setActiveNav('help');
    $('#app').innerHTML = `
      <h1>Help</h1>
      <div class="notice">
        <strong>How to use this tool</strong>
        This is a starter “Help page” (REQ 1.8 / 3.9). Replace placeholders with your videos and job aids.
      </div>

      <div class="grid two" style="margin-top:14px;">
        <section class="card">
          <div class="card-hd"><h2 style="margin:0;">Quick start</h2></div>
          <div class="card-bd">
            <ol>
              <li>Go to <strong>Home</strong> and create a BRP.</li>
              <li>Fill Gate 1 fields, then choose <strong>Next Gate</strong> to advance.</li>
              <li>Use <strong>Save Draft</strong> anytime to save without moving gates.</li>
              <li>Resume later by opening the BRP from Home or Overview.</li>
            </ol>
          </div>
        </section>

        <section class="card">
          <div class="card-hd"><h2 style="margin:0;">Common issues</h2></div>
          <div class="card-bd">
            <ul>
              <li><strong>“Required field missing”</strong> appears when you click <em>Next Gate</em> and the gate’s required fields aren’t filled.</li>
              <li><strong>Save Draft</strong> never blocks you — it saves even if the gate is incomplete.</li>
              <li>Data is stored in your browser. If you clear browser storage, data resets.</li>
            </ul>
          </div>
        </section>
      </div>

      <div class="grid two" style="margin-top:14px;">
        <section class="card">
          <div class="card-hd"><h2 style="margin:0;">Job aids</h2></div>
          <div class="card-bd">
            <div class="notice">
              <strong>Placeholder links</strong>
              <div class="muted">Replace these with your SharePoint/Teams links.</div>
            </div>
            <ul>
              <li>BRP user guide (PDF)</li>
              <li>How to write outcomes and benefits (video)</li>
              <li>How to define KPIs and baselines (video)</li>
              <li>Governance checklist by gate (PDF)</li>
            </ul>
          </div>
        </section>

        <section class="card">
          <div class="card-hd"><h2 style="margin:0;">Admin notes</h2></div>
          <div class="card-bd">
            <p class="muted">This prototype is structured so it can later connect to SharePoint (REQ 4.1) by swapping the storage functions.</p>
            <ul>
              <li>1 BRP = 1 record (single JSON object here).</li>
              <li>Gate value enforces progression (1 → 7).</li>
              <li>Light audit log is stored locally (mock of REQ 5.2).</li>
            </ul>
          </div>
        </section>
      </div>
    `;
  }

  function renderWizard(store, brpId) {
    setActiveNav('wizard');

    const brp = findBrp(store, brpId);
    if (!brp) {
      $('#app').innerHTML = `
        <h1>Wizard</h1>
        <div class="notice red">
          <strong>BRP not found</strong>
          The BRP ID <code>${esc(brpId)}</code> does not exist in local storage.
        </div>
        <div class="toolbar" style="margin-top:10px;">
          <button class="btn" id="go_home">Go Home</button>
        </div>
      `;
      $('#go_home').addEventListener('click', () => location.hash = '#/home');
      return;
    }

    ensureArrays(brp);
    store.lastOpenedBrpId = brp.id;
    saveStore(store);

    const gate = clampInt(brp.gate, 1, 7);
    const gateDef = GATES.find(g => g.n === gate) || GATES[0];
    const pct = calcProgressPercent(brp);
    const status = deriveStatus(brp);

    $('#app').innerHTML = `
      <div class="toolbar" style="justify-content:space-between;align-items:flex-end;">
        <div>
          <h1 style="margin-bottom:6px;">Wizard — BRP ${esc(brp.id)}</h1>
          <div class="muted">${esc(brp.title || '')} · ${badge(status)} · ${esc('Gate ' + gate)} (${esc(gateDef.short)}) <span class="muted">· Stored gate: ${esc(String(brp.gate))}</span></div>
        </div>
        <div class="toolbar">
          <button class="btn" id="btn_back_home">Back to Home</button>
          <button class="btn" id="btn_open_overview">Overview</button>
        </div>
      </div>

      <div class="card" style="margin-top:12px;">
        <div class="card-bd">
          <div class="grid two">
            <div>
              <div class="muted">Current gate</div>
              <div style="font-size:1.1rem;font-weight:800;">${esc(gateDef.name)}</div>
              <div class="muted">${esc(gateDef.body)}</div>
            </div>
            <div>
              <div class="muted">Progress</div>
              <div class="progress" title="${pct}%">
                <div style="width:${pct}%;"></div>
              </div>
              <div class="help">${pct}% (Gate 1 = 0%, Gate 7 = 100%)</div>
            </div>
          </div>
        </div>
      </div>

      <div class="tabs" role="tablist" aria-label="Gates">
        ${GATES.map(g => `<button class="tab ${g.n===gate?'active':''}" data-gate="${g.n}" ${g.n!==gate?'disabled':''} title="Workflow enforces order">${esc('Gate ' + g.n)}</button>`).join('')}
      </div>

      <div class="card" style="margin-top:10px;">
        <div class="card-hd">
          <h2 style="margin:0;">Gate ${esc(gate)} form</h2>
        </div>
        <div class="card-bd" id="gate_form"></div>

        <div class="card-ft">
          <div class="toolbar">
            <button class="btn" id="btn_prev" ${gate<=1?'disabled':''}>Back</button>
            <button class="btn" id="btn_save">Save Draft</button>
          </div>
          <div class="toolbar">
            <button class="btn primary" id="btn_next">Next Gate</button>
          </div>
        </div>
      </div>

      <div class="hr"></div>
      <div class="help">
        Workflow rules: Save Draft saves without advancing. Next Gate validates required fields for the current gate, saves, then advances the gate value.
      </div>
    `;

    $('#btn_back_home').addEventListener('click', () => location.hash = '#/home');
    $('#btn_open_overview').addEventListener('click', () => location.hash = '#/overview');

    renderGateForm(store, brp, gate);

    $('#btn_prev').addEventListener('click', () => {
      // Save whatever is currently typed before moving back
      collectGateInputs(brp, gate, { validate:false });
      const g = clampInt(brp.gate,1,7);
      if (g <= 1) return;
      brp.gate = clampInt(g - 1, 1, 7);
      brp.updatedAt = nowISO();
      brp.status = deriveStatus(brp);
      logBrp(store, brp, 'move_prev', { toGate: brp.gate, fromGate: g });
      saveStore(store);
      location.hash = '#/wizard/' + brp.id + '?g=' + brp.gate + '&t=' + Date.now();
      render();
      toast('Moved', `Now at Gate ${brp.gate}.`);
    });

    $('#btn_save').addEventListener('click', () => {
      const ok = collectGateInputs(brp, gate, { validate:false });
      if (!ok) return;
      brp.updatedAt = nowISO();
      brp.status = deriveStatus(brp);
      logBrp(store, brp, 'save_draft', { gate });
      saveStore(store);
      location.hash = '#/wizard/' + brp.id + '?g=' + brp.gate + '&t=' + Date.now();
      render();
      toast('Saved', 'Draft saved (no gate change).');
    });

    $('#btn_next').addEventListener('click', () => {
      // Always save what the user has entered (draft) before trying to advance.
      // This removes the need to click Save Draft and then Next Gate.
      const draftOk = collectGateInputs(brp, gate, { validate:false });
      if (draftOk) {
        brp.updatedAt = nowISO();
        brp.status = deriveStatus(brp);
        logBrp(store, brp, 'auto_save', { gate });
        saveStore(store);
      }

      const ok = collectGateInputs(brp, gate, { validate:true });
      if (!ok) return;

      // advance
      const fromGate = clampInt(brp.gate, 1, 7);
      brp.gate = clampInt(fromGate + 1, 1, 7);
      brp.updatedAt = nowISO();
      brp.status = deriveStatus(brp);

      // sync dependent arrays (benefits/kpis) when moving forward
      syncDerivedLists(brp);

      logBrp(store, brp, 'advance', { fromGate, toGate: brp.gate });
      saveStore(store);
      toast('Advanced', `Saved and moved to Gate ${brp.gate}.`);
      location.hash = '#/wizard/' + brp.id;
    });
  }

  // ---------------------------
  // Gate form rendering
  // ---------------------------
  function renderGateForm(store, brp, gate) {
    const host = $('#gate_form');
    host.innerHTML = gateTemplate(brp, gate);

    // wire dynamic add/remove buttons
    wireDynamicLists(store, brp, gate);

    // Auto-save on field changes so edits aren't lost when users add/remove rows.
    // (Debounced to avoid noisy writes.)
    let t = null;
    const scheduleSave = (hint='edit') => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        collectGateInputs(brp, gate, { validate:false });
        brp.updatedAt = nowISO();
        brp.status = deriveStatus(brp);
        logBrp(store, brp, hint, { gate });
        saveStore(store);
      }, 250);
    };

    host.querySelectorAll('input, textarea, select').forEach(el => {
      el.addEventListener('change', () => scheduleSave('edit'));
      el.addEventListener('blur', () => scheduleSave('edit'));
    });
  }

  function gateTemplate(brp, gate) {
    ensureArrays(brp);

    if (gate === 1) {
      const g1 = brp.g1 || {};
      return `
        <div class="notice">
          <strong>Gate 1 — Create the BRP shell</strong>
          Capture early intent, assumptions, ownership, and initial governance date.
        </div>

        <div class="grid two">
          ${fieldText('g1_projectName', 'Project Name', g1.projectName || brp.title || '', true)}
          ${fieldText('g1_projectNumber', 'Project Number', g1.projectNumber || brp.projectNumber || '', true)}
        </div>

        ${fieldArea('g1_projectDescription', 'Project Description', g1.projectDescription || '', true, 'High-level description (why, what, who).')}
        <div class="grid two">
          ${fieldText('g1_programmeName', 'Programme Name', g1.programmeName || '', false)}
          ${fieldSelect('g1_brpStatus', 'BRP Status', ['Draft','In Progress','Complete'], g1.brpStatus || brp.status || 'Draft', true)}
        </div>

        <div class="grid two">
          ${fieldText('g1_sponsorName', 'Project Sponsor Name', g1.sponsorName || '', true)}
          ${fieldSelect('g1_sponsorOrg', 'Project Sponsor Org', ORGS, g1.sponsorOrg || ORGS[0], true)}
        </div>

        <div class="grid two">
          ${fieldText('g1_businessOwnerName', 'Business Owner Name', g1.businessOwnerName || '', true)}
          ${fieldSelect('g1_businessOwnerOrg', 'Business Owner Org', ORGS, g1.businessOwnerOrg || ORGS[0], true)}
        </div>

        <div class="grid two">
          ${fieldText('g1_implementerName', 'Project Implementer Name', g1.implementerName || '', false)}
          ${fieldSelect('g1_implementerOrg', 'Project Implementer Org', ORGS, g1.implementerOrg || ORGS[0], false)}
        </div>

        ${fieldText('g1_departments', 'Departments / Agencies', g1.departmentsAgencies || '', false, 'Comma-separated is fine.')}
        ${fieldDate('g1_govDate', 'Upcoming governance reporting date', g1.governanceReportingDate || '', true)}
      `;
    }

    if (gate === 2) {
      const g2 = brp.g2;
      return `
        <div class="notice">
          <strong>Gate 2 — Confirm business need and desired outcomes</strong>
          Add outcomes (up to 6), options (up to 4), benefits and KPIs, plus roles & responsibilities.
        </div>

        <h3>Outcomes (up to 6)</h3>
        <div id="outcomes_list">
          ${g2.outcomes.map((o, idx) => outcomeRow(o, idx)).join('')}
        </div>
        <div class="toolbar">
          <button class="btn small" id="add_outcome" ${g2.outcomes.length>=6?'disabled':''}>+ Add outcome</button>
        </div>

        <div class="hr"></div>
        <h3>Project options (up to 4)</h3>
        <div id="options_list">
          ${g2.options.map((o, idx) => optionRow(o, idx)).join('')}
        </div>
        <div class="toolbar">
          <button class="btn small" id="add_option" ${g2.options.length>=4?'disabled':''}>+ Add option</button>
        </div>

        <div class="hr"></div>
        <h3>Benefits & KPIs (linked to outcomes)</h3>
        <div class="help">Add benefits and KPIs. Later gates pull from these lists for reporting/actuals.</div>

        <div id="benefits_list">
          ${g2.benefits.map((b, idx) => benefitRow(b, idx, g2.outcomes)).join('')}
        </div>
        <div class="toolbar">
          <button class="btn small" id="add_benefit">+ Add benefit</button>
        </div>

        <div class="hr"></div>
        <div id="kpis_list">
          ${g2.kpis.map((k, idx) => kpiRow(k, idx, g2.benefits)).join('')}
        </div>
        <div class="toolbar">
          <button class="btn small" id="add_kpi">+ Add KPI</button>
        </div>

        <div class="hr"></div>
        <h3>Roles & responsibilities</h3>
        <div id="roles_list">
          ${g2.roles.map((r, idx) => roleRow(r, idx)).join('')}
        </div>
        <div class="toolbar">
          <button class="btn small" id="add_role">+ Add role</button>
        </div>

        <div class="hr"></div>
        ${fieldDate('g2_govDate', 'Upcoming governance reporting date', brp.g2.governanceReportingDate || '', true)}
      `;
    }

    if (gate === 3) {
      // benefits reporting metadata
      const benefits = (brp.g2?.benefits || []).map(b => ({ id: b.id, name: b.name }));
      const list = ensureBenefitReporting(brp);

      return `
        <div class="notice">
          <strong>Gate 3 — Benefit reporting setup</strong>
          For each benefit, define reporting date, frequency, and expected date of realization.
        </div>

        ${benefits.length ? `
          <div class="table-wrap" style="margin-top:10px;">
            <table aria-label="Benefit reporting table">
              <thead>
                <tr>
                  <th>Benefit</th>
                  <th>First reporting date</th>
                  <th>Reporting frequency</th>
                  <th>Expected date of realization</th>
                </tr>
              </thead>
              <tbody>
                ${benefits.map(b => {
                  const row = list.find(x => x.benefitId === b.id) || { firstReportingDate:'', frequency:'Quarterly', expectedRealizationDate:'' };
                  return `
                    <tr>
                      <td><strong>${esc(b.name || ('Benefit ' + b.id))}</strong></td>
                      <td><input type="date" data-brep="${esc(b.id)}" data-k="firstReportingDate" value="${esc(row.firstReportingDate || '')}"/></td>
                      <td>
                        <select data-brep="${esc(b.id)}" data-k="frequency">
                          ${REPORT_FREQ.map(f => `<option value="${esc(f)}" ${f===row.frequency?'selected':''}>${esc(f)}</option>`).join('')}
                        </select>
                      </td>
                      <td><input type="date" data-brep="${esc(b.id)}" data-k="expectedRealizationDate" value="${esc(row.expectedRealizationDate || '')}"/></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="notice red" style="margin-top:10px;">
            <strong>No benefits found</strong>
            Add benefits in Gate 2 first, then return to Gate 3.
          </div>
        `}

        <div class="hr"></div>
        ${fieldDate('g3_govDate', 'Upcoming governance reporting date', brp.g3.governanceReportingDate || '', true)}
      `;
    }

    if (gate === 4) {
      const kpis = (brp.g2?.kpis || []).map(k => ({ id:k.id, name:k.name, unit:k.unit }));
      const list = ensureKpiActuals(brp, 'g4');

      return `
        <div class="notice">
          <strong>Gate 4 — KPI actuals + lessons learned</strong>
          Record KPI actual values (as available) and capture lessons learned related to benefits realization.
        </div>

        ${kpis.length ? kpiActualsTable(kpis, list, 'g4') : `
          <div class="notice red" style="margin-top:10px;">
            <strong>No KPIs found</strong>
            Add KPIs in Gate 2 first, then return.
          </div>
        `}

        ${fieldArea('g4_lessons', 'Lessons learned (benefits realization)', brp.g4.lessons || '', false)}
        <div class="hr"></div>
        ${fieldDate('g4_govDate', 'Upcoming governance reporting date', brp.g4.governanceReportingDate || '', true)}
      `;
    }

    if (gate === 5) {
      const kpis = (brp.g2?.kpis || []).map(k => ({ id:k.id, name:k.name, unit:k.unit }));
      const list = ensureKpiActuals(brp, 'g5');
      const transitions = brp.g5.transitions || [];

      return `
        <div class="notice">
          <strong>Gate 5 — Definition (lock-in)</strong>
          Confirm scope and benefits, record KPI actuals, and track transition activities / dependencies.
        </div>

        ${kpis.length ? kpiActualsTable(kpis, list, 'g5') : `
          <div class="notice red" style="margin-top:10px;">
            <strong>No KPIs found</strong>
            Add KPIs in Gate 2 first, then return.
          </div>
        `}

        ${fieldArea('g5_lessons', 'Lessons learned (benefits realization)', brp.g5.lessons || '', false)}

        <div class="hr"></div>
        <h3>Transition activities / dependencies</h3>
        <div id="transitions_list">
          ${transitions.map((t, idx) => transitionRow(t, idx)).join('')}
        </div>
        <div class="toolbar">
          <button class="btn small" id="add_transition">+ Add transition activity</button>
        </div>

        <div class="hr"></div>
        ${fieldDate('g5_govDate', 'Upcoming governance reporting date', brp.g5.governanceReportingDate || '', true)}
      `;
    }

    if (gate === 6) {
      const kpis = (brp.g2?.kpis || []).map(k => ({ id:k.id, name:k.name, unit:k.unit }));
      const list = ensureKpiActuals(brp, 'g6');

      // benefits realization flags
      const benefits = (brp.g2?.benefits || []).map(b => ({ id:b.id, name:b.name }));
      const realizedList = ensureBenefitRealized(brp, 'g6');

      return `
        <div class="notice">
          <strong>Gate 6 — Implementation (monitoring)</strong>
          Continue KPI actuals, record realization status, dates, and lessons learned.
        </div>

        ${kpis.length ? kpiActualsTable(kpis, list, 'g6') : `
          <div class="notice red" style="margin-top:10px;">
            <strong>No KPIs found</strong>
            Add KPIs in Gate 2 first, then return.
          </div>
        `}

        <div class="hr"></div>
        <h3>Benefit realization status</h3>
        ${benefits.length ? benefitRealizedTable(benefits, realizedList, 'g6') : `
          <div class="notice red"><strong>No benefits found</strong> Add benefits in Gate 2.</div>
        `}

        ${fieldArea('g6_lessons', 'Lessons learned (benefits realization)', brp.g6.lessons || '', false)}
        <div class="hr"></div>
        ${fieldDate('g6_govDate', 'Upcoming governance reporting date', brp.g6.governanceReportingDate || '', true)}
      `;
    }

    // gate 7
    const kpis = (brp.g2?.kpis || []).map(k => ({ id:k.id, name:k.name, unit:k.unit }));
    const list = ensureKpiActuals(brp, 'g7');

    const benefits = (brp.g2?.benefits || []).map(b => ({ id:b.id, name:b.name }));
    const realizedList = ensureBenefitRealized(brp, 'g7');

    return `
      <div class="notice">
        <strong>Gate 7 — Closeout</strong>
        Finalize KPI actuals, confirm realization, capture lessons learned, and add governance sign-off.
      </div>

      ${kpis.length ? kpiActualsTable(kpis, list, 'g7') : `
        <div class="notice red" style="margin-top:10px;">
          <strong>No KPIs found</strong>
          Add KPIs in Gate 2 first, then return.
        </div>
      `}

      <div class="hr"></div>
      <h3>Benefit realization status</h3>
      ${benefits.length ? benefitRealizedTable(benefits, realizedList, 'g7') : `
        <div class="notice red"><strong>No benefits found</strong> Add benefits in Gate 2.</div>
      `}

      ${fieldArea('g7_lessons', 'Lessons learned (benefits realization)', brp.g7.lessons || '', false)}
      ${fieldArea('g7_signoff', 'Governance sign-off / Closeout notes', brp.g7.signoff || '', false, 'Who signed off, when, and any conditions or exceptions.')}

      <div class="hr"></div>
      ${fieldSelect('g7_status', 'Update BRP status to completed', ['Draft','In Progress','Complete'], brp.status || 'In Progress', true)}
      ${fieldDate('g7_govDate', 'Upcoming governance reporting date', brp.g7.governanceReportingDate || '', false)}
    `;
  }

  // ---------------------------
  // Gate input collection + validation
  // ---------------------------
  function collectGateInputs(brp, gate, { validate }) {
    ensureArrays(brp);

    // IMPORTANT: Save Draft should never block progression due to missing fields.
    // Next Gate validates required fields.
    const reqFail = (msg, elId) => {
      toast('Required field missing', msg);
      const el = document.getElementById(elId);
      if (el) el.focus();
      return false;
    };

    if (gate === 1) {
      const g1 = brp.g1 || {};
      g1.projectName = getVal('g1_projectName');
      g1.projectNumber = getVal('g1_projectNumber');
      g1.projectDescription = getVal('g1_projectDescription');
      g1.programmeName = getVal('g1_programmeName');
      g1.sponsorName = getVal('g1_sponsorName');
      g1.sponsorOrg = getVal('g1_sponsorOrg');
      g1.businessOwnerName = getVal('g1_businessOwnerName');
      g1.businessOwnerOrg = getVal('g1_businessOwnerOrg');
      g1.implementerName = getVal('g1_implementerName');
      g1.implementerOrg = getVal('g1_implementerOrg');
      g1.departmentsAgencies = getVal('g1_departments');
      g1.brpStatus = getVal('g1_brpStatus');
      g1.governanceReportingDate = getVal('g1_govDate');
      brp.title = g1.projectName || brp.title;
      brp.projectNumber = g1.projectNumber || brp.projectNumber;
      brp.status = g1.brpStatus || brp.status;
      brp.g1 = g1;

      if (validate) {
        if (!g1.projectName) return reqFail('Project Name is required.', 'g1_projectName');
        if (!g1.projectNumber) return reqFail('Project Number is required.', 'g1_projectNumber');
        if (!g1.projectDescription) return reqFail('Project Description is required to advance to Gate 2.', 'g1_projectDescription');
        if (!g1.sponsorName) return reqFail('Project Sponsor Name is required.', 'g1_sponsorName');
        if (!g1.businessOwnerName) return reqFail('Business Owner Name is required.', 'g1_businessOwnerName');
        if (!g1.governanceReportingDate) return reqFail('Upcoming governance reporting date is required.', 'g1_govDate');
      }
      // Gate 1 always allows advancement once required fields are met
      return true;
    }

    if (gate === 2) {
      // outcomes/options/benefits/kpis/roles are already edited inline in the DOM (we read them now)
      brp.g2.outcomes = readOutcomeRows();
      brp.g2.options = readOptionRows();
      brp.g2.benefits = readBenefitRows();
      brp.g2.kpis = readKpiRows();
      brp.g2.roles = readRoleRows();
      brp.g2.governanceReportingDate = getVal('g2_govDate');

      if (validate) {
        if (!brp.g2.outcomes.length) return reqFail('Add at least one outcome to advance.', 'add_outcome');
        if (!brp.g2.options.length) return reqFail('Add at least one project option to advance.', 'add_option');
        if (!brp.g2.benefits.length) return reqFail('Add at least one benefit to advance.', 'add_benefit');
        if (!brp.g2.kpis.length) return reqFail('Add at least one KPI to advance.', 'add_kpi');
        if (!brp.g2.governanceReportingDate) return reqFail('Upcoming governance reporting date is required.', 'g2_govDate');

        // basic completeness checks
        if (brp.g2.outcomes.some(o => !o.name)) return reqFail('Every outcome must have a name.', 'out_name_0');
        if (brp.g2.options.some(o => !o.name || !o.description)) return reqFail('Every option needs a name and description.', 'opt_name_0');
        if (brp.g2.benefits.some(b => !b.name || !b.type)) return reqFail('Every benefit needs a name and type.', 'ben_name_0');
        if (brp.g2.kpis.some(k => !k.name || !k.unit)) return reqFail('Every KPI needs a name and unit.', 'kpi_name_0');
      }

      // maintain IDs
      normalizeIds(brp.g2.outcomes, 'O');
      normalizeIds(brp.g2.options, 'P');
      normalizeIds(brp.g2.benefits, 'B');
      normalizeIds(brp.g2.kpis, 'K');

      return true;
    }

    if (gate === 3) {
      // benefit reporting table inputs
      brp.g3.benefitReporting = readBenefitReporting();
      brp.g3.governanceReportingDate = getVal('g3_govDate');

      if (validate) {
        if (!brp.g3.governanceReportingDate) return reqFail('Upcoming governance reporting date is required.', 'g3_govDate');
        // only require reporting setup when benefits exist
        if ((brp.g2.benefits || []).length) {
          const missing = brp.g3.benefitReporting.some(r => !r.firstReportingDate || !r.frequency || !r.expectedRealizationDate);
          if (missing) return reqFail('Fill all benefit reporting fields (first date, frequency, expected realization) to advance.', 'g3_govDate');
        }
      }
      return true;
    }

    if (gate === 4) {
      brp.g4.kpiActuals = readKpiActuals('g4');
      brp.g4.lessons = getVal('g4_lessons');
      brp.g4.governanceReportingDate = getVal('g4_govDate');

      if (validate) {
        if (!brp.g4.governanceReportingDate) return reqFail('Upcoming governance reporting date is required.', 'g4_govDate');
      }
      return true;
    }

    if (gate === 5) {
      brp.g5.kpiActuals = readKpiActuals('g5');
      brp.g5.lessons = getVal('g5_lessons');
      brp.g5.transitions = readTransitionRows();
      brp.g5.governanceReportingDate = getVal('g5_govDate');

      if (validate) {
        if (!brp.g5.governanceReportingDate) return reqFail('Upcoming governance reporting date is required.', 'g5_govDate');
        // transitions optional, but if present, enforce minimal completeness
        const bad = brp.g5.transitions.some(t => !t.activity || !t.accountable || !t.targetEndDate);
        if (bad) return reqFail('Complete each transition row (activity, accountable, target date) or remove it.', 'add_transition');
      }
      return true;
    }

    if (gate === 6) {
      brp.g6.kpiActuals = readKpiActuals('g6');
      brp.g6.realized = readBenefitRealized('g6');
      brp.g6.lessons = getVal('g6_lessons');
      brp.g6.governanceReportingDate = getVal('g6_govDate');

      if (validate) {
        if (!brp.g6.governanceReportingDate) return reqFail('Upcoming governance reporting date is required.', 'g6_govDate');
      }
      return true;
    }

    // gate 7
    brp.g7.kpiActuals = readKpiActuals('g7');
    brp.g7.realized = readBenefitRealized('g7');
    brp.g7.lessons = getVal('g7_lessons');
    brp.g7.signoff = getVal('g7_signoff');
    brp.status = getVal('g7_status') || brp.status;
    brp.g7.governanceReportingDate = getVal('g7_govDate');

    if (validate) {
      // Gate 7 can be closed without another "upcoming" date
      if (!brp.status) return reqFail('Set BRP status.', 'g7_status');
      if (brp.status === 'Complete' && !brp.g7.signoff) {
        return reqFail('Add governance sign-off / closeout notes to mark Complete.', 'g7_signoff');
      }
    }
    return true;
  }

  function getVal(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    return (el.value || '').trim();
  }

  // ---------------------------
  // Dynamic lists (Gate 2, Gate 5)
  // ---------------------------
  function wireDynamicLists(store, brp, gate) {
    if (gate === 2) {
      const addOutcomeBtn = $('#add_outcome');
      if (addOutcomeBtn) addOutcomeBtn.addEventListener('click', () => {
        // preserve what the user already typed before re-rendering
        collectGateInputs(brp, 2, { validate:false });
        brp.g2.outcomes.push({ id: genId('O'), name:'', alignmentDoc:'', alignmentSection:'' });
        brp.updatedAt = nowISO();
        logBrp(store, brp, 'gate2_add', { kind:'outcome' });
        saveStore(store);
        rerenderWizardCurrent(store, brp.id);
      });

      const addOptionBtn = $('#add_option');
      if (addOptionBtn) addOptionBtn.addEventListener('click', () => {
        collectGateInputs(brp, 2, { validate:false });
        brp.g2.options.push({ id: genId('P'), name:'', description:'', selected:false });
        brp.updatedAt = nowISO();
        logBrp(store, brp, 'gate2_add', { kind:'option' });
        saveStore(store);
        rerenderWizardCurrent(store, brp.id);
      });

      const addBenefitBtn = $('#add_benefit');
      if (addBenefitBtn) addBenefitBtn.addEventListener('click', () => {
        collectGateInputs(brp, 2, { validate:false });
        brp.g2.benefits.push({ id: genId('B'), outcomeId: (brp.g2.outcomes[0]?.id || ''), name:'', type:'', owner:'', kpiTargetByOption:'' , baseline:'', baselineAssumptions:'', targetAssumptions:'' });
        brp.updatedAt = nowISO();
        logBrp(store, brp, 'gate2_add', { kind:'benefit' });
        saveStore(store);
        rerenderWizardCurrent(store, brp.id);
      });

      const addKpiBtn = $('#add_kpi');
      if (addKpiBtn) addKpiBtn.addEventListener('click', () => {
        collectGateInputs(brp, 2, { validate:false });
        brp.g2.kpis.push({ id: genId('K'), benefitId: (brp.g2.benefits[0]?.id || ''), name:'', unit:'', baseline:'', baselineAssumptions:'', targetByOption:'' , targetAssumptions:'' });
        brp.updatedAt = nowISO();
        logBrp(store, brp, 'gate2_add', { kind:'kpi' });
        saveStore(store);
        rerenderWizardCurrent(store, brp.id);
      });

      const addRoleBtn = $('#add_role');
      if (addRoleBtn) addRoleBtn.addEventListener('click', () => {
        collectGateInputs(brp, 2, { validate:false });
        brp.g2.roles.push({ roleType:'Project Manager', responsibility:'', name:'' });
        brp.updatedAt = nowISO();
        logBrp(store, brp, 'gate2_add', { kind:'role' });
        saveStore(store);
        rerenderWizardCurrent(store, brp.id);
      });

      // remove + selected toggles
      $$('#gate_form [data-del]').forEach(btn => btn.addEventListener('click', () => {
        const kind = btn.getAttribute('data-kind');
        const idx = clampInt(btn.getAttribute('data-del'), 0, 999);
        collectGateInputs(brp, 2, { validate:false });
        if (kind === 'outcome') brp.g2.outcomes.splice(idx, 1);
        if (kind === 'option') brp.g2.options.splice(idx, 1);
        if (kind === 'benefit') brp.g2.benefits.splice(idx, 1);
        if (kind === 'kpi') brp.g2.kpis.splice(idx, 1);
        if (kind === 'role') brp.g2.roles.splice(idx, 1);
        brp.updatedAt = nowISO();
        logBrp(store, brp, 'gate2_remove', { kind, idx });
        saveStore(store);
        rerenderWizardCurrent(store, brp.id);
      }));

      $$('#gate_form [data-selopt]').forEach(el => el.addEventListener('change', () => {
        const idx = clampInt(el.getAttribute('data-selopt'), 0, 999);
        brp.g2.options[idx].selected = !!el.checked;
        brp.updatedAt = nowISO();
        logBrp(store, brp, 'gate2_update', { kind:'option_selected', idx, selected: brp.g2.options[idx].selected });
        saveStore(store);
      }));
    }

    if (gate === 5) {
      const add = $('#add_transition');
      if (add) add.addEventListener('click', () => {
        collectGateInputs(brp, 5, { validate:false });
        brp.g5.transitions.push({ activity:'', accountable:'', targetEndDate:'' });
        brp.updatedAt = nowISO();
        logBrp(store, brp, 'gate5_add', { kind:'transition' });
        saveStore(store);
        rerenderWizardCurrent(store, brp.id);
      });

      $$('#gate_form [data-del-trans]').forEach(btn => btn.addEventListener('click', () => {
        const idx = clampInt(btn.getAttribute('data-del-trans'), 0, 999);
        collectGateInputs(brp, 5, { validate:false });
        brp.g5.transitions.splice(idx, 1);
        brp.updatedAt = nowISO();
        logBrp(store, brp, 'gate5_remove', { kind:'transition', idx });
        saveStore(store);
        rerenderWizardCurrent(store, brp.id);
      }));
    }
  }

  function rerenderWizardCurrent(store, brpId) {
    // keep current gate number
    const r = route();
    if (r.page === 'wizard') {
      // hash might already be the same; update anyway
      location.hash = '#/wizard/' + brpId;
      render();
    }
  }

  function genId(prefix) {
    return prefix + Math.random().toString(16).slice(2, 8).toUpperCase();
  }

  function normalizeIds(list, prefix) {
    for (const item of list) {
      if (!item.id || typeof item.id !== 'string') item.id = genId(prefix);
    }
  }

  // Gate 2 readers
  function readOutcomeRows() {
    const rows = [];
    $$('#outcomes_list .row-outcome').forEach((row, idx) => {
      rows.push({
        id: row.getAttribute('data-id') || genId('O'),
        name: (row.querySelector('[data-k="name"]')?.value || '').trim(),
        alignmentDoc: (row.querySelector('[data-k="alignmentDoc"]')?.value || '').trim(),
        alignmentSection: (row.querySelector('[data-k="alignmentSection"]')?.value || '').trim(),
      });
    });
    return rows;
  }

  function readOptionRows() {
    const rows = [];
    $$('#options_list .row-option').forEach((row) => {
      rows.push({
        id: row.getAttribute('data-id') || genId('P'),
        name: (row.querySelector('[data-k="name"]')?.value || '').trim(),
        description: (row.querySelector('[data-k="description"]')?.value || '').trim(),
        selected: !!(row.querySelector('[data-k="selected"]')?.checked)
      });
    });
    return rows;
  }

  function readBenefitRows() {
    const rows = [];
    $$('#benefits_list .row-benefit').forEach(row => {
      rows.push({
        id: row.getAttribute('data-id') || genId('B'),
        outcomeId: (row.querySelector('[data-k="outcomeId"]')?.value || '').trim(),
        name: (row.querySelector('[data-k="name"]')?.value || '').trim(),
        type: (row.querySelector('[data-k="type"]')?.value || '').trim(),
        owner: (row.querySelector('[data-k="owner"]')?.value || '').trim(),
      });
    });
    return rows;
  }

  function readKpiRows() {
    const rows = [];
    $$('#kpis_list .row-kpi').forEach(row => {
      rows.push({
        id: row.getAttribute('data-id') || genId('K'),
        benefitId: (row.querySelector('[data-k="benefitId"]')?.value || '').trim(),
        name: (row.querySelector('[data-k="name"]')?.value || '').trim(),
        unit: (row.querySelector('[data-k="unit"]')?.value || '').trim(),
        baseline: (row.querySelector('[data-k="baseline"]')?.value || '').trim(),
        baselineAssumptions: (row.querySelector('[data-k="baselineAssumptions"]')?.value || '').trim(),
        targetByOption: (row.querySelector('[data-k="targetByOption"]')?.value || '').trim(),
        targetAssumptions: (row.querySelector('[data-k="targetAssumptions"]')?.value || '').trim(),
      });
    });
    return rows;
  }

  function readRoleRows() {
    const rows = [];
    $$('#roles_list .row-role').forEach(row => {
      rows.push({
        roleType: (row.querySelector('[data-k="roleType"]')?.value || '').trim(),
        responsibility: (row.querySelector('[data-k="responsibility"]')?.value || '').trim(),
        name: (row.querySelector('[data-k="name"]')?.value || '').trim(),
      });
    });
    return rows;
  }

  // ---------------------------
  // Gate 3 benefit reporting
  // ---------------------------
  function ensureBenefitReporting(brp) {
    ensureArrays(brp);
    const benefits = brp.g2.benefits || [];
    const list = brp.g3.benefitReporting || [];
    // ensure one row per benefit
    for (const b of benefits) {
      if (!list.find(x => x.benefitId === b.id)) {
        list.push({ benefitId: b.id, firstReportingDate:'', frequency:'Quarterly', expectedRealizationDate:'' });
      }
    }
    // remove rows for deleted benefits
    const keep = new Set(benefits.map(b => b.id));
    brp.g3.benefitReporting = list.filter(x => keep.has(x.benefitId));
    return brp.g3.benefitReporting;
  }

  function readBenefitReporting() {
    const map = {};
    $$('[data-brep]').forEach(el => {
      const id = el.getAttribute('data-brep');
      const k = el.getAttribute('data-k');
      map[id] = map[id] || { benefitId:id, firstReportingDate:'', frequency:'Quarterly', expectedRealizationDate:'' };
      if (k === 'frequency') map[id][k] = el.value;
      else map[id][k] = (el.value || '').trim();
    });
    return Object.values(map);
  }

  // ---------------------------
  // KPI actuals tables (G4–G7)
  // ---------------------------
  function ensureKpiActuals(brp, gateKey) {
    ensureArrays(brp);
    const kpis = brp.g2.kpis || [];
    const list = (brp[gateKey].kpiActuals || []);
    for (const k of kpis) {
      if (!list.find(x => x.kpiId === k.id)) list.push({ kpiId:k.id, actualValue:'', actualDate:'' });
    }
    const keep = new Set(kpis.map(k => k.id));
    brp[gateKey].kpiActuals = list.filter(x => keep.has(x.kpiId));
    return brp[gateKey].kpiActuals;
  }

  function kpiActualsTable(kpis, list, gateKey) {
    return `
      <div class="table-wrap" style="margin-top:10px;">
        <table aria-label="KPI actuals table">
          <thead>
            <tr>
              <th>KPI</th>
              <th>Unit</th>
              <th>Actual value</th>
              <th>Actual date</th>
            </tr>
          </thead>
          <tbody>
            ${kpis.map(k => {
              const row = list.find(x => x.kpiId === k.id) || { actualValue:'', actualDate:'' };
              return `
                <tr>
                  <td><strong>${esc(k.name || ('KPI ' + k.id))}</strong></td>
                  <td class="muted">${esc(k.unit || '')}</td>
                  <td><input type="text" data-kpia="${esc(gateKey)}" data-id="${esc(k.id)}" data-k="actualValue" value="${esc(row.actualValue || '')}" placeholder="e.g., 75"/></td>
                  <td><input type="date" data-kpia="${esc(gateKey)}" data-id="${esc(k.id)}" data-k="actualDate" value="${esc(row.actualDate || '')}"/></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function readKpiActuals(gateKey) {
    const map = {};
    $$(`[data-kpia="${gateKey}"]`).forEach(el => {
      const id = el.getAttribute('data-id');
      const k = el.getAttribute('data-k');
      map[id] = map[id] || { kpiId:id, actualValue:'', actualDate:'' };
      map[id][k] = (el.value || '').trim();
    });
    return Object.values(map);
  }

  // ---------------------------
  // Benefit realized tables (G6–G7)
  // ---------------------------
  function ensureBenefitRealized(brp, gateKey) {
    ensureArrays(brp);
    const benefits = brp.g2.benefits || [];
    const list = (brp[gateKey].realized || []);
    for (const b of benefits) {
      if (!list.find(x => x.benefitId === b.id)) list.push({ benefitId:b.id, realized:'No', actualRealizationDate:'' });
    }
    const keep = new Set(benefits.map(b => b.id));
    brp[gateKey].realized = list.filter(x => keep.has(x.benefitId));
    return brp[gateKey].realized;
  }

  function benefitRealizedTable(benefits, list, gateKey) {
    return `
      <div class="table-wrap" style="margin-top:10px;">
        <table aria-label="Benefit realization table">
          <thead>
            <tr>
              <th>Benefit</th>
              <th>Realized?</th>
              <th>Actual date of realization</th>
            </tr>
          </thead>
          <tbody>
            ${benefits.map(b => {
              const row = list.find(x => x.benefitId === b.id) || { realized:'No', actualRealizationDate:'' };
              return `
                <tr>
                  <td><strong>${esc(b.name || ('Benefit ' + b.id))}</strong></td>
                  <td>
                    <select data-breal="${esc(gateKey)}" data-id="${esc(b.id)}" data-k="realized">
                      <option value="No" ${row.realized==='No'?'selected':''}>No</option>
                      <option value="Yes" ${row.realized==='Yes'?'selected':''}>Yes</option>
                    </select>
                  </td>
                  <td>
                    <input type="date" data-breal="${esc(gateKey)}" data-id="${esc(b.id)}" data-k="actualRealizationDate" value="${esc(row.actualRealizationDate || '')}"/>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function readBenefitRealized(gateKey) {
    const map = {};
    $$(`[data-breal="${gateKey}"]`).forEach(el => {
      const id = el.getAttribute('data-id');
      const k = el.getAttribute('data-k');
      map[id] = map[id] || { benefitId:id, realized:'No', actualRealizationDate:'' };
      map[id][k] = (el.value || '').trim();
    });
    return Object.values(map);
  }

  // ---------------------------
  // Gate 5 transitions
  // ---------------------------
  function readTransitionRows() {
    const rows = [];
    $$('#transitions_list .row-transition').forEach(row => {
      rows.push({
        activity: (row.querySelector('[data-k="activity"]')?.value || '').trim(),
        accountable: (row.querySelector('[data-k="accountable"]')?.value || '').trim(),
        targetEndDate: (row.querySelector('[data-k="targetEndDate"]')?.value || '').trim(),
      });
    });
    return rows;
  }

  // ---------------------------
  // Derived list sync
  // ---------------------------
  function syncDerivedLists(brp) {
    ensureBenefitReporting(brp);
    ensureKpiActuals(brp, 'g4');
    ensureKpiActuals(brp, 'g5');
    ensureKpiActuals(brp, 'g6');
    ensureKpiActuals(brp, 'g7');
    ensureBenefitRealized(brp, 'g6');
    ensureBenefitRealized(brp, 'g7');
  }

  // ---------------------------
  // HTML row builders
  // ---------------------------
  function outcomeRow(o, idx) {
    return `
      <div class="card" style="margin:10px 0;">
        <div class="card-bd row-outcome" data-id="${esc(o.id || '')}">
          <div class="toolbar" style="justify-content:space-between;">
            <strong>Outcome ${idx+1}</strong>
            <button class="btn small" data-kind="outcome" data-del="${idx}" title="Remove outcome">Remove</button>
          </div>

          ${fieldText(`out_name_${idx}`, 'Outcome name', o.name || '', true, '', 'data-k="name"')}
          <div class="grid two">
            ${fieldText('', 'Strategic alignment document', o.alignmentDoc || '', false, '', 'data-k="alignmentDoc"')}
            ${fieldText('', 'Relevant section', o.alignmentSection || '', false, '', 'data-k="alignmentSection"')}
          </div>
        </div>
      </div>
    `;
  }

  function optionRow(o, idx) {
    return `
      <div class="card" style="margin:10px 0;">
        <div class="card-bd row-option" data-id="${esc(o.id || '')}">
          <div class="toolbar" style="justify-content:space-between;">
            <strong>Option ${idx+1}</strong>
            <button class="btn small" data-kind="option" data-del="${idx}" title="Remove option">Remove</button>
          </div>

          ${fieldText(`opt_name_${idx}`, 'Option name', o.name || '', true, '', 'data-k="name"')}
          ${fieldArea('', 'Option description', o.description || '', true, '', 'data-k="description"')}

          <div class="field">
            <label>
              <input type="checkbox" data-k="selected" data-selopt="${idx}" ${o.selected?'checked':''}/>
              Selected option
            </label>
            <div class="help">Check the option chosen in the business case.</div>
          </div>
        </div>
      </div>
    `;
  }

  function benefitRow(b, idx, outcomes) {
    const outOpts = (outcomes || []).map(o => `<option value="${esc(o.id)}" ${o.id===b.outcomeId?'selected':''}>${esc(o.name || o.id)}</option>`).join('');
    return `
      <div class="card" style="margin:10px 0;">
        <div class="card-bd row-benefit" data-id="${esc(b.id || '')}">
          <div class="toolbar" style="justify-content:space-between;">
            <strong>Benefit ${idx+1}</strong>
            <button class="btn small" data-kind="benefit" data-del="${idx}">Remove</button>
          </div>

          <div class="grid two">
            <div class="field">
              <label>Linked outcome</label>
              <select data-k="outcomeId">
                <option value="">— select —</option>
                ${outOpts}
              </select>
              <div class="help">Connect benefits to outcomes (REQ 1.6).</div>
            </div>
            ${fieldText(`ben_name_${idx}`, 'Benefit name', b.name || '', true, '', 'data-k="name"')}
          </div>

          <div class="grid two">
            ${fieldText('', 'Benefit type', b.type || '', true, 'e.g., efficiency, quality, compliance', 'data-k="type"')}
            ${fieldText('', 'Benefit owner (name/position)', b.owner || '', false, '', 'data-k="owner"')}
          </div>
        </div>
      </div>
    `;
  }

  function kpiRow(k, idx, benefits) {
    const benOpts = (benefits || []).map(b => `<option value="${esc(b.id)}" ${b.id===k.benefitId?'selected':''}>${esc(b.name || b.id)}</option>`).join('');
    return `
      <div class="card" style="margin:10px 0;">
        <div class="card-bd row-kpi" data-id="${esc(k.id || '')}">
          <div class="toolbar" style="justify-content:space-between;">
            <strong>KPI ${idx+1}</strong>
            <button class="btn small" data-kind="kpi" data-del="${idx}">Remove</button>
          </div>

          <div class="grid two">
            <div class="field">
              <label>Linked benefit</label>
              <select data-k="benefitId">
                <option value="">— select —</option>
                ${benOpts}
              </select>
            </div>
            ${fieldText(`kpi_name_${idx}`, 'KPI name', k.name || '', true, '', 'data-k="name"')}
          </div>

          <div class="grid two">
            ${fieldText('', 'KPI unit of measure', k.unit || '', true, 'e.g., %, days, dollars', 'data-k="unit"')}
            ${fieldText('', 'Baseline value', k.baseline || '', false, '', 'data-k="baseline"')}
          </div>

          ${fieldArea('', 'Baseline assumptions', k.baselineAssumptions || '', false, '', 'data-k="baselineAssumptions"')}
          ${fieldText('', 'KPI target by option', k.targetByOption || '', false, 'e.g., Option A: 80%, Option B: 75%', 'data-k="targetByOption"')}
          ${fieldArea('', 'Target value assumptions', k.targetAssumptions || '', false, '', 'data-k="targetAssumptions"')}
        </div>
      </div>
    `;
  }

  function roleRow(r, idx) {
    return `
      <div class="card" style="margin:10px 0;">
        <div class="card-bd row-role">
          <div class="toolbar" style="justify-content:space-between;">
            <strong>Role ${idx+1}</strong>
            <button class="btn small" data-kind="role" data-del="${idx}">Remove</button>
          </div>

          <div class="grid two">
            <div class="field">
              <label>Role</label>
              <select data-k="roleType">
                ${ROLE_TYPES.map(x => `<option value="${esc(x)}" ${x===r.roleType?'selected':''}>${esc(x)}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label>Name / position</label>
              <input type="text" data-k="name" value="${esc(r.name || '')}" placeholder="e.g., Director, ERP Program"/>
            </div>
          </div>

          ${fieldArea('', 'Responsibility', r.responsibility || '', false, 'Free text', 'data-k="responsibility"')}
        </div>
      </div>
    `;
  }

  function transitionRow(t, idx) {
    return `
      <div class="card" style="margin:10px 0;">
        <div class="card-bd row-transition">
          <div class="toolbar" style="justify-content:space-between;">
            <strong>Transition ${idx+1}</strong>
            <button class="btn small" data-del-trans="${idx}">Remove</button>
          </div>

          ${fieldText('', 'Transition activity / dependency', t.activity || '', false, '', 'data-k="activity"')}
          <div class="grid two">
            ${fieldText('', 'Position accountable', t.accountable || '', false, '', 'data-k="accountable"')}
            <div class="field">
              <label>Target end-date delivery</label>
              <input type="date" data-k="targetEndDate" value="${esc(t.targetEndDate || '')}"/>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ---------------------------
  // Field components
  // ---------------------------
  function fieldText(id, label, value, required=false, help='', extraAttrs='') {
    const req = required ? '<span class="muted"> (required)</span>' : '';
    const did = id ? `id="${esc(id)}"` : '';
    return `
      <div class="field">
        <label ${id?`for="${esc(id)}"`:''}>${esc(label)}${req}</label>
        <input ${did} type="text" value="${esc(value)}" ${extraAttrs}/>
        ${help ? `<div class="help">${esc(help)}</div>` : ''}
      </div>
    `;
  }

  function fieldArea(id, label, value, required=false, help='', extraAttrs='') {
    const req = required ? '<span class="muted"> (required)</span>' : '';
    const did = id ? `id="${esc(id)}"` : '';
    return `
      <div class="field">
        <label ${id?`for="${esc(id)}"`:''}>${esc(label)}${req}</label>
        <textarea ${did} ${extraAttrs}>${esc(value)}</textarea>
        ${help ? `<div class="help">${esc(help)}</div>` : ''}
      </div>
    `;
  }

  function fieldSelect(id, label, options, value, required=false) {
    const req = required ? '<span class="muted"> (required)</span>' : '';
    return `
      <div class="field">
        <label for="${esc(id)}">${esc(label)}${req}</label>
        <select id="${esc(id)}">
          ${options.map(o => `<option value="${esc(o)}" ${String(o)===String(value)?'selected':''}>${esc(o)}</option>`).join('')}
        </select>
      </div>
    `;
  }

  function fieldDate(id, label, value, required=false) {
    const req = required ? '<span class="muted"> (required)</span>' : '';
    return `
      <div class="field">
        <label for="${esc(id)}">${esc(label)}${req}</label>
        <input id="${esc(id)}" type="date" value="${esc(value)}"/>
      </div>
    `;
  }

  // ---------------------------
  // UI helpers
  // ---------------------------
  function badge(status) {
    const s = String(status || '').toLowerCase();
    let cls = 'warn';
    if (s === 'complete') cls = 'good';
    else if (s === 'draft') cls = 'bad';
    return `<span class="badge ${cls}">${esc(status)}</span>`;
  }

    function governanceCard(brp) {
    const gate = clampInt(brp.gate,1,7);
    const pct = calcProgressPercent(brp);
    const status = deriveStatus(brp);
    const gdef = GATES.find(g=>g.n===gate);
    const sponsor = brp.g1?.sponsorName || '';
    const govDate =
      (gate===5?brp.g5?.governanceReportingDate:
      gate===6?brp.g6?.governanceReportingDate:
      gate===7?brp.g7?.governanceReportingDate:
      brp.g1?.governanceReportingDate) || '';

    return `
      <section class="card">
        <div class="card-hd">
          <div class="toolbar" style="justify-content:space-between;">
            <div>
              <div style="font-weight:800;">${esc(brp.id)} — ${esc(brp.title || '')}</div>
              <div class="muted">Gate ${esc(gate)} · ${esc(gdef?.short || '')}</div>
            </div>
            <div>${badge(status)}</div>
          </div>
        </div>
        <div class="card-bd">
          <div class="kv">
            <div class="k">Sponsor</div><div>${esc(safeText(sponsor))}</div>
            <div class="k">Project #</div><div>${esc(safeText(brp.projectNumber))}</div>
            <div class="k">Governance date</div><div>${esc(safeText(govDate))}</div>
            <div class="k">Progress</div>
            <div>
              <div class="progress"><div style="width:${pct}%;"></div></div>
              <div class="help">${esc(pct)}%</div>
            </div>
          </div>
          <div class="hr"></div>
          <div class="help">Use <strong>View</strong> for a clean read-only pack. Use <strong>Print</strong> to generate a governance-ready sheet.</div>
        </div>
        <div class="card-ft">
          <div class="muted">Updated ${esc(fmtDate(brp.updatedAt || brp.createdAt))}</div>
          <div class="toolbar">
            <button class="btn small" data-view="${esc(brp.id)}">View</button>
            <button class="btn small" data-print="${esc(brp.id)}">Print</button>
            <button class="btn small" data-open="${esc(brp.id)}">Open wizard</button>
          </div>
        </div>
      </section>
    `;
  }

function fmtDate(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleString(undefined, { year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' });
    } catch { return iso; }
  }

  // ---------------------------
  // Router / Render
  // ---------------------------
  function render() {
    const store = loadStore();
    // Seed demo BRPs (only if the browser has none yet)
    if (seedDemoData(store)) {
      saveStore(store);
    }
    const r = route();

    if (r.page === 'wizard') {
      const id = (r.param || '').trim();
      renderWizard(store, id);
      return;
    }

    if (r.page === 'home') return renderHome(store);
    if (r.page === 'create') return renderCreate(store);
    if (r.page === 'list' || r.page === 'overview') return renderBrpList(store);
    if (r.page === 'governance') return renderGovernance(store, r.param);
    if (r.page === 'analytics') return renderAnalytics(store);
    if (r.page === 'help') return renderHelp();

    // default
    location.hash = '#/home';
    renderHome(store);
  }

  window.addEventListener('hashchange', render);
  window.addEventListener('load', render);

})();
