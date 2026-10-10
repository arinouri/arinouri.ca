// AI Stock Picks Arena: a static dashboard. All numbers come from data/dashboard.json,
// which a GitHub Action rewrites after every upload and every market close.
const DATA = (window.ARENA_DATA || "data/").replace(/\/?$/, "/");
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const state = { book: "all", win: "all", amount: 100, pickTab: null, posTab: "open", tradeSearch: "", hiddenModels: new Set() };
let D = null;

const BLURB = {
  claude: ["Anthropic · AI researcher", "Anthropic’s AI assistant. Researches market news, proposes stocks, and explains when to hold or sell. The model used here is proprietary."],
  chatgpt: ["OpenAI · AI researcher", "OpenAI’s AI assistant. Uses the same briefing and trading rules to choose stocks and review earlier picks. The model used here is proprietary."],
  grok: ["xAI · AI researcher", "xAI’s AI assistant. Researches stocks through a scheduled cloud routine and submits its reasoning. This arena does not run an open-weight Grok model."],
  learner: ["Our code · Learning agent", "A small learning program, not a chatbot. Studies completed AI trades and copies up to five picks it expects to outperform the market."],
  fly: ["Our code · Random baseline", "A program that picks stocks randomly with fixed exit rules. It gives us a baseline to compare research with chance. No actual fly involved."],
  fly_evo: ["Our code · Independent bandit", "A separate reward-trained agent. It ranks liquid stocks from past-only price, volume, volatility and SPY-relative signals; it never copies AI picks."],
  momentum: ["Our code · Rules baseline", "A transparent non-AI baseline that ranks liquid stocks by 20-session momentum using only prices known at selection time."],
};
const BOOKS = { all: "All books", moonshot: "Moonshots", catalyst: "Catalyst plays", compounder: "Compounders" };
const WINS = { all: "All time", "30d": "30 days", "7d": "7 days" };

const usd = (n, d = 2) => (n < 0 ? "-" : n > 0 ? "+" : "") + "$" + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const price = (n) => (n == null ? "-" : "$" + Number(n).toFixed(2));
const pct = (n, d = 1) => (n == null ? "-" : (n > 0 ? "+" : "") + (n * 100).toFixed(d) + "%");
const cls = (n) => (n > 0 ? "up" : n < 0 ? "down" : "mut");
const dateFmt = (s) => new Date(s + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const timeFmt = (iso) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const M = () => Object.fromEntries(D.meta.models.map((m) => [m.key, m]));
const name = (k) => M()[k]?.display_name || k;
const color = (k) => M()[k]?.color || "#888";
const scale = () => (state.amount > 0 ? state.amount : 100) / D.meta.notional;
const rows = () => D.boards[state.win][state.book];

function seg(group, opts, active) {
  return `<div class="seg" role="group">${Object.entries(opts).map(([k, v]) =>
    `<button data-${group}="${k}" aria-pressed="${k === active}">${v}</button>`).join("")}</div>`;
}

// ---------------------------------------------------------------- sections
function hero() {
  const m = D.meta, n = m.next_night;
  const scored = D.boards.all.all.reduce((sum, r) => sum + r.positions, 0);
  return `<nav class="nav" aria-label="Main navigation"><a class="brand" href="#"><span class="brand-icon" aria-hidden="true">↗</span> ARENA<span class="brand-sub">AI STOCK PICKS</span></a><div class="nav-links"><a href="#chart">Performance</a><a href="#who">Contestants</a><a href="#how">The experiment</a></div><a class="nav-code" href="https://github.com/${esc(m.repo)}">GitHub ↗</a></nav>
    <header class="hero"><div class="hero-copy">
    <p class="eyebrow"><span class="live-dot"></span> A STUDENT-BUILT EXPERIMENT · PUBLIC DATA</p>
    <h1>AI picks.<br/>Real prices.<br/><span>Open results.</span></h1>
    <p class="lead">Can AI stock research beat the market and simple rules? Claude, ChatGPT and Grok commit calls before the open. We score them beside SPY, random, momentum and reward-trained baselines.</p>
    <div class="btns">
      <a class="btn primary" href="#chart">Explore the results <span aria-hidden="true">↗</span></a>
      <a class="btn" href="#how">How it works</a>
    </div>
    <p class="updated">Updated ${timeFmt(m.generated_at)} · Simulated trades, no real money</p></div>
    <aside class="experiment-card"><div class="experiment-top"><span>EXPERIMENT / 002</span><span class="pill">In progress</span></div><h2>Research meets<br/>reality.</h2><p>${m.models.length} different approaches.<br/>One transparent scoreboard.</p><div class="experiment-stats"><div><b>${String(m.models.length).padStart(2, "0")}</b><span>Contestants</span></div><div><b>${scored.toLocaleString()}</b><span>Scored positions</span></div><div><b>$${m.notional}</b><span>Per simulated pick</span></div></div><div class="next-session"><span>Next trading session</span><b>${dateFmt(n.session)}</b><small>Picks due ${dateFmt(n.run_date)} · 11:59 PM ET</small></div></aside>
    </header>
    <div class="steps">
      <div class="step"><b class="n">01</b><div><h3>Research &amp; commit</h3><p>Picks and reasoning are published before trading starts.</p></div></div>
      <div class="step"><b class="n">02</b><div><h3>Simulate the trade</h3><p>A $${m.notional} buy at the next open, including small trading costs.</p></div></div>
      <div class="step"><b class="n">03</b><div><h3>Keep an honest score</h3><p>Real prices, public results, and an S&amp;P 500 comparison.</p></div></div>
    </div>`;
}

function contestants() {
  const st = Object.fromEntries(D.contestants.map((c) => [c.model, c]));
  return `<section id="who"><h2>Meet the contestants</h2>
    <p class="sub">Three AI researchers, a pick-copying learner, a random control, an independent reward-trained agent, and a simple momentum baseline.</p>
    <div class="grid cols5">${D.meta.models.map((m) => {
      const [tag, text] = BLURB[m.key] || ["", ""];
      const c = st[m.key];
      return `<div class="card who" style="--c:${m.color}">
        <span class="tag">${esc(tag)}</span>
        <h3><span class="dot"></span>${esc(m.display_name)}</h3>
        <p>${esc(text)}</p>
        ${c ? `<p class="when"><span class="pill ${esc(c.state)}">${c.state === "in" ? "Picks in" : c.state === "waiting" ? "Waiting for tonight" : esc(c.state)}</span></p>` : ""}
      </div>`;
    }).join("")}</div>
    <p class="note"><b>Public code ≠ open AI models.</b> The scoring code, learning programs, database and raw picks are public. Hosted AI model versions are recorded only when their provider reliably reports them.</p>
  </section>`;
}

function portfolioOverview() {
  const all = Object.values(D.portfolios || {});
  if (!all.length) return "";
  const available = all.filter((p) => p.equity?.length).sort((a, b) => (b.metrics.total_return ?? -Infinity) - (a.metrics.total_return ?? -Infinity));
  const shown = available.length ? available : all;
  const metric = (label, value, kind = "pct") => `<div><span>${label}</span><b class="${kind === "pct" ? cls(value) : ""}">${value == null ? "Unavailable" : kind === "pct" ? pct(value) : esc(value)}</b></div>`;
  return `<section id="portfolio"><div class="section-heading"><div><p class="eyebrow">FIXED CAPITAL / PRIMARY COMPARISON</p><h2>$10,000 portfolio simulation</h2></div></div>
    <p class="sub">Every contestant starts with the same cash, invests 5% per admitted position, and can hold at most 20 positions. Cash cannot be reused until a trade exits. This is separate from the original $100-per-pick research score.</p>
    <div class="portfolio-grid">${shown.map((p, i) => { const m = p.metrics; return `<article class="card portfolio-card" style="--c:${color(p.model)}"><div class="portfolio-title"><span class="dot"></span><h3>${esc(name(p.model))}</h3>${available.length ? `<span class="rank">#${i + 1}</span>` : ""}</div><div class="portfolio-return ${cls(m.total_return)}">${pct(m.total_return)}</div><small>Portfolio return</small><div class="kv">${metric("Vs SPY", m.alpha_vs_spy)}${metric("Max drawdown", m.max_drawdown)}${metric("Sharpe", m.sharpe == null ? null : Number(m.sharpe).toFixed(2), "number")}${metric("Exposure", m.exposure)}${metric("Closed trades", m.completed_trades, "number")}${metric("Costs", m.transaction_costs == null ? null : "$" + Number(m.transaction_costs).toFixed(2), "number")}</div>${m.sample_warning ? `<p class="sample-warning">${esc(m.sample_warning)}</p>` : ""}</article>`; }).join("")}</div>
    <p class="note"><b>Accounting convention:</b> same-day exit cash is not reused for that morning's new entries. Risk ratios remain unavailable until there are at least 20 daily observations; missing values are never shown as zero.</p>
  </section>`;
}

function leaderboard() {
  const r = rows(), k = scale();
  const has = r.some((x) => x.positions > 0);
  const top = r.filter((x) => x.positions > 0).slice(0, 3);
  return `<section id="leaderboard"><h2>Leaderboard</h2>
    <p class="sub">Trade-level research score if you had put <b>${state.amount || 100} dollars</b> into every pick. This allows unlimited independent notionals; use the fixed-capital section for investable portfolio comparisons.</p>
    <div class="tabs">${seg("book", BOOKS, state.book)}${seg("win", WINS, state.win)}
      <label class="amt">Invest $<input id="amt" type="number" min="1" step="10" value="${state.amount}" /> per pick</label></div>
    ${has ? `<div class="podium">${top.map((x, i) => `<div class="card pod" style="--c:${color(x.model)}">
        <div class="rank">#${i + 1}</div><h3><span class="dot"></span>${esc(name(x.model))}</h3>
        <div class="big ${cls(x.total_pnl)}">${usd(x.total_pnl * k)}</div>
        <div class="mut" style="font-size:13px">${pct(x.return_on_capital)} on ${x.positions} picks</div>
        <div class="kv"><div><span>Win rate</span><b>${x.win_rate == null ? "-" : Math.round(x.win_rate * 100) + "%"}</b></div>
          <div><span>Vs S&amp;P 500</span><b class="${cls(x.avg_alpha)}">${pct(x.avg_alpha)}</b></div>
          <div><span>Best</span><b>${x.best ? esc(x.best.ticker) + " " + pct(x.best.ret, 0) : "-"}</b></div>
          <div><span>Worst</span><b>${x.worst ? esc(x.worst.ticker) + " " + pct(x.worst.ret, 0) : "-"}</b></div></div></div>`).join("")}</div>
      <div class="tablewrap"><table><thead><tr><th>#</th><th class="l">Contestant</th><th>Profit</th><th>Return</th><th>Win rate</th><th>Avg vs S&amp;P</th><th>Hit target</th><th>Hit stop</th><th>Closed / open</th></tr></thead><tbody>
      ${r.map((x) => `<tr><td>${x.positions ? x.rank : "—"}</td><td class="l"><span class="dot" style="--c:${color(x.model)}"></span>${esc(name(x.model))}${x.positions ? "" : ' <span class="pill">Not scored yet</span>'}</td>
        <td class="${cls(x.total_pnl)}"><b>${x.positions ? usd(x.total_pnl * k) : "—"}</b></td><td class="${cls(x.return_on_capital)}">${x.positions ? pct(x.return_on_capital) : "—"}</td>
        <td>${x.win_rate == null ? "-" : Math.round(x.win_rate * 100) + "%"}</td><td class="${cls(x.avg_alpha)}">${pct(x.avg_alpha)}</td>
        <td>${x.target_rate == null ? "-" : Math.round(x.target_rate * 100) + "%"}</td><td>${x.stop_rate == null ? "-" : Math.round(x.stop_rate * 100) + "%"}</td>
        <td>${x.closed} / ${x.open}</td></tr>`).join("")}</tbody></table></div>`
      : `<div class="card empty">No scored picks in this view yet.</div>`}
    <p class="note"><b>Reading it:</b> "Vs S&amp;P 500" is how much a closed pick beat (or lagged) the overall market over the same days. A model that just rides a rising market shows up here as 0%. A fair number of picks and several weeks of data are needed before any ranking means skill rather than luck.</p>
  </section>`;
}

function chart() {
  const r = rows(), k = scale();
  const series = r.filter((x) => !state.hiddenModels.has(x.model)).map((x) => ({ model: x.model, pts: x.equity.map((e) => ({ d: e.date, v: e.pnl * k })) })).filter((s) => s.pts.length);
  const dates = [...new Set(series.flatMap((s) => s.pts.map((p) => p.d)))].sort();
  const W = 720, H = 300, L = 54, R = 16, T = 14, B = 30;
  const hasData = dates.length >= 1;
  const vals = series.flatMap((s) => s.pts.map((p) => p.v));
  let lo = Math.min(0, ...(vals.length ? vals : [-1])), hi = Math.max(0, ...(vals.length ? vals : [1]));
  if (hi - lo < 1) { hi += 0.5; lo -= 0.5; }
  const pad = (hi - lo) * 0.1; lo -= pad; hi += pad;
  const x = (i, n) => L + (n <= 1 ? (W - L - R) / 2 : (i / (n - 1)) * (W - L - R));
  const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks = Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) * i) / 4);
  let body = ticks.map((t) => `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)"/><text x="${L - 8}" y="${y(t) + 4}" text-anchor="end" font-size="11" fill="var(--muted)">${usd(t, Math.abs(hi - lo) < 10 ? 1 : 0)}</text>`).join("");
  body += `<line x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}" stroke="var(--muted)" stroke-dasharray="4 4"/>`;
  if (hasData) {
    const n = dates.length;
    series.forEach((s) => {
      const path = s.pts.map((p) => `${x(dates.indexOf(p.d), n).toFixed(1)},${y(p.v).toFixed(1)}`);
      body += `<polyline fill="none" stroke="${color(s.model)}" stroke-width="2.5" stroke-linejoin="round" points="${path.join(" ")}"/>`;
      const last = s.pts[s.pts.length - 1];
      body += `<circle cx="${x(dates.indexOf(last.d), n)}" cy="${y(last.v)}" r="5" fill="${color(s.model)}" stroke="var(--card)" stroke-width="2"/>`;
    });
    const step = Math.max(1, Math.ceil(n / 6));
    dates.forEach((d, i) => { if (i % step === 0 || i === n - 1) body += `<text x="${x(i, n)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="var(--muted)">${dateFmt(d).replace(/^\w+, /, "")}</text>`; });
  }
  const legend = D.meta.models.map((m) => {
    const scored = r.find((x) => x.model === m.key);
    const last = scored?.equity.at(-1);
    return `<button class="legend-item" data-model="${m.key}" aria-pressed="${!state.hiddenModels.has(m.key)}" style="--c:${m.color}"><span class="dot"></span>${esc(m.display_name)}<span class="v">${last ? usd(last.pnl * k) : "Awaiting data"}</span></button>`;
  }).join("");
  return `<section id="chart"><div class="section-heading"><div><p class="eyebrow">THE SCOREBOARD</p><h2>Performance over time</h2></div><a class="text-link" href="${DATA}export.csv" download>Download data ↓</a></div>
    <p class="sub">Cumulative simulated profit in US dollars. Each colour is a contestant; above zero means a gain. Filters also update the leaderboard below.</p>
    <div class="tabs">${seg("book", BOOKS, state.book)}${seg("win", WINS, state.win)}</div>
    <div class="card chartbox"><div class="chartwrap" id="chartwrap">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Profit over time for each contestant" id="svg">${body}</svg>
      ${hasData ? "" : `<div class="chart-empty"><b>${state.hiddenModels.size === D.meta.models.length ? "Choose a contestant below" : "No scored trades in this view yet"}</b><span class="mut">Results appear after trades are scored. No preview or invented results are shown.</span></div>`}
      <div class="tip" id="tip" hidden></div></div>
      <div class="legend" aria-label="Toggle chart contestants">${legend}</div>
      ${dates.length === 1 ? '<p class="chart-note">Only one scored trading day so far. Each dot is a real result; lines will connect as more days arrive.</p>' : '<p class="chart-note">Select a contestant to show or hide its line. Hover over the graph to inspect a day.</p>'}
      ${dates.length ? `<details class="chart-data"><summary>View graph values as a table</summary><div class="tablewrap"><table><thead><tr><th>Date</th>${series.map((s) => `<th>${esc(name(s.model))}</th>`).join("")}</tr></thead><tbody>${dates.map((d) => `<tr><td>${dateFmt(d)}</td>${series.map((s) => {const p = s.pts.find((p) => p.d === d); return `<td>${p ? usd(p.v) : "—"}</td>`;}).join("")}</tr>`).join("")}</tbody></table></div></details>` : ""}</div>
  </section>`;
}

function status() {
  return `<section id="tonight"><h2>Is everyone connected?</h2>
    <p class="sub">Picks for the ${dateFmt(D.contestants[0].session)} session are due ${dateFmt(D.contestants[0].night)} by 11:59 PM ET.</p>
    <div class="grid cols5">${D.contestants.map((c) => `<div class="card who" style="--c:${color(c.model)}"><h3><span class="dot"></span>${esc(name(c.model))}</h3>
      <p><span class="pill ${esc(c.state)}">${c.state === "in" ? "Picks in" : c.state === "waiting" ? "Waiting" : esc(c.state)}</span></p>
      <p class="when">${c.at ? "Uploaded " + timeFmt(c.at) : esc(c.schedule)}</p>
      ${c.last_upload ? `<p class="when">Last upload: ${timeFmt(c.last_upload.at)} (${esc(c.last_upload.status)})</p>` : `<p class="when">Never uploaded yet.</p>`}</div>`).join("")}</div></section>`;
}

function picks() {
  const subs = D.latest.submissions;
  const keys = Object.keys(subs).filter((k) => subs[k] && subs[k].picks?.length);
  if (!keys.length) return "";
  const tab = keys.includes(state.pickTab) ? state.pickTab : keys[0];
  const s = subs[tab];
  const tabs = `<div class="seg">${keys.map((k) => `<button data-pick="${k}" aria-pressed="${k === tab}">${esc(name(k))}</button>`).join("")}</div>`;
  const lv = (p) => `Buy at open · target ${price(p.orig_target)} · stop ${price(p.orig_stop)}`;
  return `<section id="picks"><h2>Picks for ${dateFmt(D.latest.target_date)}</h2>
    <p class="sub">What each contestant chose, with its reasoning. Targets are where it plans to sell for a gain; stops are where it cuts a loss.</p>
    <div class="tabs">${tabs}</div>
    <div class="card"><p class="mut" style="margin:0 0 6px;font-size:14px"><b>Market view:</b> ${esc(s.market_view || "")}</p>
    ${s.picks.map((p) => `<div class="pick"><div class="top"><span class="tk">${esc(p.ticker)}</span><span class="pill">${esc(BOOKS[p.bucket] || p.bucket)}</span>${p.confidence ? `<span class="pill">${esc(p.confidence)} confidence</span>` : ""}
      <span class="lv">${lv(p)}</span></div><p>${esc(p.thesis)}</p>
      ${p.main_risk ? `<details><summary>Main risk</summary><p>${esc(p.main_risk)}</p>${(p.sources || []).map((u) => `<small><a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60))}</a></small><br/>`).join("")}</details>` : ""}</div>`).join("")}
    ${s.reviews?.length ? `<details><summary>Hold / sell calls on existing positions (${s.reviews.length})</summary>${s.reviews.map((r) => `<div class="pick"><div class="top"><span class="tk">${esc(r.ticker)}</span><span class="pill ${r.action === "SELL" ? "missed" : "in"}">${esc(r.action)}</span></div><p>${esc(r.reason)}</p></div>`).join("")}</details>` : ""}</div></section>`;
}

function positions() {
  const source = state.posTab === "open" ? D.open : D.closed;
  const query = state.tradeSearch.trim().toLowerCase();
  const list = query ? source.filter((p) => [p.ticker, p.model, name(p.model), p.bucket, p.exit_reason].some((v) => String(v || "").toLowerCase().includes(query))) : source;
  const rowsHtml = list.slice(0, 60).map((p) => `<tr><td class="l"><span class="dot" style="--c:${color(p.model)}"></span>${esc(name(p.model))}</td><td class="l"><b>${esc(p.ticker)}</b></td><td class="l">${esc(BOOKS[p.bucket] || p.bucket)}</td>
    <td>${price(p.entry_price)}</td><td>${price(state.posTab === "open" ? p.last_price : p.exit_price)}</td><td class="${cls(p.ret)}"><b>${pct(p.ret)}</b></td>
    <td class="${cls(p.pnl)}">${usd(p.pnl * scale())}</td><td class="l">${state.posTab === "open" ? price(p.stop) + " / " + price(p.target) : esc((p.exit_reason || "").replace("_", " "))}</td></tr>`).join("");
  return `<section id="positions"><h2>Every position</h2>
    <p class="sub">Search and filter the published trade history. Download the complete CSV for all rows and audit fields.</p>
    <div class="tabs"><div class="seg"><button data-pos="open" aria-pressed="${state.posTab === "open"}">Open (${D.open.length})</button><button data-pos="closed" aria-pressed="${state.posTab === "closed"}">Closed (${D.closed.length})</button></div><label class="trade-search"><span>Search trades</span><input id="trade-search" type="search" value="${esc(state.tradeSearch)}" placeholder="Ticker, contestant, strategy…" /></label></div>
    <div class="tablewrap"><table><thead><tr><th class="l">Who</th><th class="l">Stock</th><th class="l">Type</th><th>Bought</th><th>${state.posTab === "open" ? "Now" : "Sold"}</th><th>Return</th><th>Profit</th><th class="l">${state.posTab === "open" ? "Stop / target" : "Why it closed"}</th></tr></thead><tbody>${rowsHtml || `<tr><td colspan="8" class="empty">Nothing here yet.</td></tr>`}</tbody></table></div></section>`;
}

function learner() {
  const L = D.learner;
  if (!L || L.error) return "";
  const max = Math.max(0.02, ...L.weights.map((w) => Math.abs(w.mean) + w.sd));
  const c = M().learner.color;
  const bars = L.weights.map((w) => {
    const pos = (v) => 50 + (v / max) * 50;
    const a = pos(w.mean - w.sd), b = pos(w.mean + w.sd);
    const f0 = Math.min(50, pos(w.mean)), f1 = Math.max(50, pos(w.mean));
    return `<div class="bar" style="--c:${c}"><span>${esc(w.feature)}</span><div class="track"><span class="mid"></span><span class="band" style="left:${Math.max(0, a)}%;width:${Math.min(100, b) - Math.max(0, a)}%"></span><span class="fill" style="left:${f0}%;width:${f1 - f0}%"></span></div><span class="val ${cls(w.mean)}">${pct(w.mean, 2)}</span></div>`;
  }).join("");
  return `<section id="learner"><h2>The Learner's brain</h2>
    <p class="sub">A reinforcement-learning agent. It doesn't read the news. After every closed AI pick it asks "did I expect this?", and the size of the surprise adjusts what it believes (the same prediction-error signal real brains use). Each night it copies up to 5 AI picks it expects to beat the S&amp;P 500.</p>
    <div class="card"><p class="mut" style="margin:0 0 10px;font-size:14px">${L.observations ? `Learned from <b>${L.observations}</b> closed trades. Bars show how much each trait adds to a pick's expected return versus the market; the shaded band is how unsure it still is.` : "It hasn't seen a closed trade yet, so every belief is still zero with a wide band of doubt. The bars start moving as trades close."}</p>${bars}
    ${L.recent?.length ? `<details><summary>Latest surprises</summary>${L.recent.slice(0, 8).map((e) => `<div class="pick"><div class="top"><span class="tk">${esc(e.ticker)}</span><span class="pill">${esc(name(e.model))}</span><span class="lv">expected ${pct(e.expected)} · got ${pct(e.reward)} · surprise <b class="${cls(e.rpe)}">${pct(e.rpe)}</b></span></div></div>`).join("")}</details>` : ""}</div></section>`;
}

function evo() {
  const E = D.fly_evo;
  if (!E || E.error) return "";
  const max = Math.max(0.02, ...E.weights.map((w) => Math.abs(w.mean) + w.sd));
  const c = color("fly_evo");
  const bars = E.weights.map((w) => { const pos = (v) => 50 + (v / max) * 50; const a = pos(w.mean - w.sd), b = pos(w.mean + w.sd); const f0 = Math.min(50, pos(w.mean)), f1 = Math.max(50, pos(w.mean)); return `<div class="bar" style="--c:${c}"><span>${esc(w.feature)}</span><div class="track"><span class="mid"></span><span class="band" style="left:${Math.max(0, a)}%;width:${Math.min(100, b) - Math.max(0, a)}%"></span><span class="fill" style="left:${f0}%;width:${f1 - f0}%"></span></div><span class="val ${cls(w.mean)}">${pct(w.mean, 2)}</span></div>`; }).join("");
  return `<section id="evo"><h2>Fruit Fly EVO learning lab</h2><p class="sub">EVO is separate from the random control. It independently ranks liquid stocks using price momentum, SPY-relative strength, volatility, volume and drawdown available at decision time. Completed trades provide clipped, risk-adjusted rewards—not emotions.</p><div class="learning-grid"><article class="card"><div class="learning-kpis"><div><span>Model</span><b>${esc(E.version)}</b></div><div><span>Observations</span><b>${E.observations}</b></div><div><span>Cumulative reward</span><b class="${cls(E.cumulative_reward)}">${pct(E.cumulative_reward)}</b></div></div><p class="mut">Reward: ${esc(E.reward)}. Data version: ${esc(E.data_version)}.</p>${bars}</article><article class="card"><h3>Recent reward signals</h3>${E.recent?.length ? E.recent.slice(0, 10).map((e) => `<div class="reward-row"><span><b>${esc(e.ticker)}</b><small>${dateFmt(e.date)} · ${esc(BOOKS[e.bucket] || e.bucket)}</small></span><b class="${cls(e.reward)}">${pct(e.reward)}</b></div>`).join("") : '<p class="mut">No EVO trade has closed yet. The prior remains deliberately uncertain; increased cumulative reward alone will not be treated as proof of skill.</p>'}</article></div></section>`;
}

function ideas() {
  if (!D.ideas?.length) return "";
  return `<section id="ideas"><h2>What the AIs say they learned</h2><p class="sub">Each night the AIs write down lessons from their results. This is the idea board.</p>
    <div class="ideas">${D.ideas.slice(0, 9).map((i) => `<div class="card" style="border-top:4px solid ${color(i.model)}"><h3>${esc(name(i.model))} <span class="mut" style="font-weight:400">· ${dateFmt(i.date)}</span></h3><p class="mut" style="font-size:14px;margin:6px 0">${esc(i.market_view)}</p><ul>${(i.lessons || []).map((l) => `<li>${esc(l)}</li>`).join("")}</ul></div>`).join("")}</div></section>`;
}

function how() {
  const q = (a, b) => `<details><summary>${a}</summary><p>${b}</p></details>`;
  return `<section id="how" class="faq"><h2>How it works, in plain English</h2>
    ${q("Is any real money involved?", "No. Every pick is a pretend $100 buy, so nobody can lose anything. It's a scoreboard, not a fund.")}
    ${q("What are moonshots, catalyst plays and compounders?", "<b>Moonshots</b> are 5 risky one-day bets on a stock that could jump tomorrow. <b>Catalyst plays</b> are 5 trades held 1 to 5 days around fresh news like earnings. <b>Compounders</b> are up to 5 quality stocks held for weeks or months.")}
    ${q("How is a pick scored?", `Each pick is a simulated $100 buy. It ends when the price touches its <b>stop</b> (a loss limit), touches its <b>target</b>, runs out of time, or the AI tells us to sell. If one day touches both, we count the stop. Everything is compared with the S&amp;P 500 over the same days.`)}
    ${q("What is the S&P 500 comparison for?", "If every stock rises one day, every AI looks smart. Comparing with the overall market shows whether a pick did better than just owning the market.")}
    ${q("What are the Learner, Fruit Fly and EVO?", "Fruit Fly stays uniformly random as the control. The Learner evaluates and copies AI proposals. Fruit Fly EVO is independent: it selects from a liquid universe using measurable market signals and updates only after its own trades close.")}
    ${q("Which stocks are allowed?", "Only NYSE or Nasdaq stocks priced above $1 with decent trading volume (over 500K shares a day). Picks that break a rule are voided.")}
    ${q("Why might the rankings be misleading?", "Early on, a few lucky picks can put anyone on top. It takes a few hundred trades per contestant before the differences mean much. Trading costs are only roughly modelled (0.1% each way), so treat it as an experiment rather than a strategy.")}
    ${q("Can I check the data myself?", `Yes. Download the CSV at the top, or browse every raw submission and the scoring code on <a href="https://github.com/${esc(D.meta.repo)}">GitHub</a>.`)}
  </section>`;
}


// Operational health is deliberately computed from published facts, never guessed.
function health() {
  const h = D.health || {};
  const generated = Date.parse(D.meta.generated_at);
  const ageHours = Number.isFinite(generated) ? (Date.now() - generated) / 3600000 : Infinity;
  const stale = ageHours > 26 || ageHours < -1;
  const latest = D.inbox || [];
  const problems = latest.filter(x => ["rejected", "partial"].includes(x.status)).slice(0, 4);
  const last = h.last_scored_session || D.meta.last_session || "No priced session yet";
  const fresh = Number.isFinite(ageHours) ? Math.max(0, Math.round(ageHours * 10) / 10) + " hours ago" : "unknown";
  return `<section id="health" aria-label="System health and data integrity">
    <div class="section-heading"><div><p class="eyebrow">DATA INTEGRITY</p><h2>System health</h2></div><a class="text-link" target="_blank" rel="noopener" href="https://github.com/${esc(D.meta.repo)}/actions/workflows/arena.yml">Workflow history ↗</a></div>
    <div class="health-grid">
      <div class="card health-card"><div class="health-label">Data refresh</div><strong class="${stale ? "health-warning" : "health-ok"}">${stale ? "STALE" : "RECENT"}</strong><small>Last export: ${esc(fresh)}. Recency alone does not confirm jobs succeeded.</small></div>
      <div class="card health-card"><div class="health-label">Last scored session</div><strong>${esc(last)}</strong><small>Markets close on weekends and holidays.</small></div>
      <div class="card health-card"><div class="health-label">Validated system state</div><strong class="${h.state === "operational" ? "health-ok" : "health-warning"}">${esc((h.state || "unknown").toUpperCase())}</strong><small>${(h.issues || []).length ? esc(h.issues.join(" · ")) : "No persisted price, benchmark, or recent submission issue detected."}</small></div>
    </div>
    ${problems.length ? `<details class="card health-details"><summary>Inspect recent submission problems</summary>${problems.map(x => `<p><b>${esc(name(x.model))}</b> · ${esc(x.status)} · ${esc(x.path)}<br><small>${esc((x.errors || []).join("; ") || "No detailed reason available")}</small></p>`).join("")}</details>` : ""}
    <p class="note">Workflow status is linked, not guessed from export age. Operational means the persisted checks passed; it does not independently verify the data provider. <a href="https://github.com/${esc(D.meta.repo)}/blob/main/docs/METHODOLOGY.md">Read the scoring methodology</a>.</p>
  </section>`;
}

function research() {
  const all = D.boards?.all?.all || [];
  const closed = all.reduce((n, row) => n + (row.closed || 0), 0);
  return `<section id="research"><div class="section-heading"><div><p class="eyebrow">RESEARCH NOTES</p><h2>Interpreting these results</h2></div></div>
  <div class="grid cols3">
   <article class="card"><h3>Evidence so far</h3><p>${closed} closed simulated positions across contestants (including copied trades). Early results are noisy and the observations are not independent.</p></article>
   <article class="card"><h3>Fair comparisons</h3><p>The $10,000 view enforces cash and exposure limits. The legacy $100-per-pick score stays available for trade-level research and historical continuity.</p></article>
   <article class="card"><h3>Learning versus chance</h3><p>Fruit Fly is random, EVO learns independent signals, and the Learner copies AI proposals. Copied trades are correlated observations; none of these methods guarantees market-beating skill.</p></article>
  </div>
  <p class="note">All metrics are hypothetical. There is no live brokerage execution, dividends and corporate actions may be omitted, and price fills can differ from real trading. <a href="https://github.com/${esc(D.meta.repo)}/blob/main/docs/METHODOLOGY.md">Full methodology and limits ↗</a></p>
  </section>`;
}

function evaluation() {
  const E = D.evaluation;
  if (!E) return "";
  const card = (key, label) => { const r = E[key], out = r.out_of_sample, inside = r.in_sample; return `<article class="card"><h3>${label}</h3><div class="kv"><div><span>Forward observations</span><b>${out.observations}</b></div><div><span>Direction accuracy</span><b>${pct(out.direction_accuracy)}</b></div><div><span>Forward correlation</span><b>${out.correlation == null ? "Unavailable" : Number(out.correlation).toFixed(2)}</b></div><div><span>In-sample correlation</span><b>${inside.correlation == null ? "Unavailable" : Number(inside.correlation).toFixed(2)}</b></div><div><span>Forward error</span><b>${pct(out.mae)}</b></div><div><span>Warm-up</span><b>${r.warmup_observations} trades</b></div></div>${out.observations ? "" : '<p class="sample-warning">Not enough completed, prior-only decisions for a forward estimate yet.</p>'}</article>`; };
  return `<section id="evaluation"><p class="eyebrow">SCIENTIFIC VALIDATION</p><h2>Walk-forward evaluation</h2><p class="sub">An expanding-window test predicts each decision using only trades whose outcomes were already known. In-sample fit is shown solely to expose the optimism gap; it is not evidence of generalization.</p><div class="evaluation-grid">${card("learner", "The Learner")}${card("fly_evo", "Fruit Fly EVO")}</div><p class="note">${esc(E.method)}. ${esc(E.warning)}</p></section>`;
}

// ---------------------------------------------------------------- render + events
function render() {
  const y = window.scrollY;
  $("#view").innerHTML = [hero(), health(), portfolioOverview(), chart(), leaderboard(), contestants(), picks(), status(), learner(), evo(), evaluation(), positions(), ideas(), research(), how()].join("");
  window.scrollTo(0, y);
  const repo = $("#repo-link"); if (repo) repo.href = "https://github.com/" + D.meta.repo;
  wireChart();
  const note = $(".disclaimer");
  if (note) note.innerHTML = '<span class="note-dot" aria-hidden="true"></span> Student research project · Simulated trades only · Not financial advice';
  const foot = $(".foot");
  if (foot) foot.innerHTML = `<div class="footer-brand">ARENA <span>A student-built experiment by <a href="https://arinouri.ca">Arian Nouri</a>.</span></div><p>Explore the code, database and raw picks on <a href="https://github.com/${esc(D.meta.repo)}">GitHub ↗</a>. Prices: Yahoo Finance via yfinance. Early results can reflect luck; this is an experiment, not an investment recommendation.</p>`;
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-book],button[data-win],button[data-pick],button[data-pos],button[data-model]");
  if (!b || !D) return;
  if (b.dataset.model) { const m = b.dataset.model; state.hiddenModels.has(m) ? state.hiddenModels.delete(m) : state.hiddenModels.add(m); }
  if (b.dataset.book) state.book = b.dataset.book;
  if (b.dataset.win) state.win = b.dataset.win;
  if (b.dataset.pick) state.pickTab = b.dataset.pick;
  if (b.dataset.pos) state.posTab = b.dataset.pos;
  const selector = b.dataset.model ? `[data-model="${b.dataset.model}"]` : b.dataset.book ? `[data-book="${b.dataset.book}"]` : b.dataset.win ? `[data-win="${b.dataset.win}"]` : b.dataset.pick ? `[data-pick="${b.dataset.pick}"]` : `[data-pos="${b.dataset.pos}"]`;
  const section = b.closest("section")?.id;
  render();
  $(selector, section ? document.getElementById(section) : document)?.focus({ preventScroll: true });
});
document.addEventListener("change", (e) => {
  if (e.target.id === "amt") { state.amount = Math.max(1, Number(e.target.value) || 100); render(); }
});
document.addEventListener("input", (e) => {
  if (e.target.id !== "trade-search") return;
  state.tradeSearch = e.target.value;
  const section = e.target.closest("section");
  const pos = e.target.selectionStart;
  const html = document.createElement("template");
  html.innerHTML = positions().trim();
  section.replaceWith(html.content.firstElementChild);
  const input = $("#trade-search");
  input?.focus({ preventScroll: true });
  input?.setSelectionRange(pos, pos);
});

function wireChart() {
  const svg = $("#svg"), tip = $("#tip"), wrap = $("#chartwrap");
  if (!svg) return;
  const r = rows(), k = scale();
  const dates = [...new Set(r.flatMap((x) => x.equity.map((e) => e.date)))].sort();
  if (!dates.length) return;
  const move = (ev) => {
    const box = svg.getBoundingClientRect();
    const px = ((ev.touches ? ev.touches[0].clientX : ev.clientX) - box.left) / box.width * 720;
    const i = Math.max(0, Math.min(dates.length - 1, Math.round(((px - 54) / (720 - 54 - 16)) * (dates.length - 1))));
    const d = dates[i];
    tip.hidden = false;
    tip.style.left = (((dates.length <= 1 ? 54 + (720 - 70) / 2 : 54 + (i / (dates.length - 1)) * (720 - 70)) / 720) * box.width) + "px";
    tip.style.top = "30px";
    tip.innerHTML = `<b>${dateFmt(d)}</b><br/>` + r.map((x) => { const p = x.equity.find((e) => e.date === d); return p ? `<span style="color:${color(x.model)}">●</span> ${esc(name(x.model))} ${usd(p.pnl * k)}` : ""; }).filter(Boolean).join("<br/>");
  };
  wrap.addEventListener("mousemove", move);
  wrap.addEventListener("touchmove", move, { passive: true });
  wrap.addEventListener("mouseleave", () => (tip.hidden = true));
}

fetch(DATA + "dashboard.json", { cache: "no-store" })
  .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then((d) => { D = d; render(); })
  .catch((e) => { $("#view").innerHTML = `<p class="loading">Couldn't load the data (${esc(e.message)}). Try again in a minute.</p>`; });
